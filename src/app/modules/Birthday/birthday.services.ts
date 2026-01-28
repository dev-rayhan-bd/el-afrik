import httpStatus from 'http-status';
import AppError from '../../errors/AppError';
import { UserModel } from '../User/user.model';
import { ProductModel } from '../product/product.model';
import { OrderModel } from '../Orders/orders.model';
import { OrderStatus, OrderType, PaymentMethod, PaymentStatus } from '../Orders/orders.interface';
import { sendNotification, sendNotificationToAdmins } from '../../utils/sendNotification';
import { UberService } from '../Uber/uber.services';
import config from '../../config';
import Stripe from 'stripe';

const stripe = new Stripe(config.stripe_secret_key as string);
const checkEligibility = async (userId: string) => {
  const user = await UserModel.findById(userId);
  if (!user) throw new AppError(httpStatus.NOT_FOUND, 'User not found');

  const today = new Date();
  const dob = new Date(user.dob);
  const currentYear = today.getFullYear();

  const isBirthday = today.getMonth() === dob.getMonth() && today.getDate() === dob.getDate();
  const alreadyFinishedClaim = user.lastBirthdayRewardYear === currentYear;


  const showPopup = isBirthday && !alreadyFinishedClaim && !user.canClaimBirthdayReward;

  return { isBirthday, canClaim: user.canClaimBirthdayReward, showPopup };
};


// src/app/modules/Birthday/birthday.services.ts

const activateClaimStatus = async (userId: string) => {
  const user = await UserModel.findById(userId);
  if (!user) throw new AppError(httpStatus.NOT_FOUND, 'User not found');

  const today = new Date();
  const dob = new Date(user.dob);
  const currentYear = today.getFullYear();

  const isBirthday = today.getMonth() === dob.getMonth() && today.getDate() === dob.getDate();
  if (!isBirthday) {
    throw new AppError(httpStatus.BAD_REQUEST, "Today is not your birthday!");
  }

  if (user.lastBirthdayRewardYear === currentYear) {
    throw new AppError(httpStatus.BAD_REQUEST, "You have already claimed your birthday reward for this year!");
  }

  
  if (user.canClaimBirthdayReward) {
    throw new AppError(httpStatus.BAD_REQUEST, "Birthday reward is already activated!");
  }


  return await UserModel.findByIdAndUpdate(
    userId, 
    { canClaimBirthdayReward: true }, 
    { new: true }
  );
};

// const claimFreeOrder = async (userId: string, productId: string, pickupTime: string) => {
//   const user = await UserModel.findById(userId);
//   if (!user?.canClaimBirthdayReward) {
//     throw new AppError(httpStatus.BAD_REQUEST, "Please click the claim button in the popup first!");
//   }

//   const product = await ProductModel.findById(productId).populate('category');
//   if (!product) throw new AppError(httpStatus.NOT_FOUND, "Product not found");

//   const category = product.category as any;
//   if (category?.categoryName?.toLowerCase() !== 'desert') {
//     throw new AppError(httpStatus.BAD_REQUEST, "Birthday gift is only available for Desserts!");
//   }

//   const order = await OrderModel.create({
//     user: userId,
//     orderType: OrderType.PICKUP,
//     items: [{
//       product: product._id,
//       name: product.name,
//       price: 0,
//       quantity: 1,
//       total: 0,
//       points: 0
//     }],
//     subtotal: 0,      
//     totalAmount: 0,
//     deliveryFee: 0,  
//     paymentStatus: PaymentStatus.PAID,
//     paymentMethod: PaymentMethod.POINTS,
//     orderStatus: OrderStatus.ONGOING,
//     customerEmail: user.email,
//     customerName: `${user.firstName} ${user.lastName}`,
//     pickupTime,
//     notes: "Birthday Free Dessert Reward"
//   });


//   await UserModel.findByIdAndUpdate(userId, { 
//     canClaimBirthdayReward: false,
//     lastBirthdayClaimYear: new Date().getFullYear()
//   });
//   await sendNotification(
//     userId,
//     'Birthday Gift Confirmed! 🎂',
//     `Your free dessert order is placed. Please pick it up at ${pickupTime}.`,
//     'birthday'
//   );
//   await sendNotificationToAdmins(
//   'Birthday Gift Claimed 🎂',
//   `${user?.firstName} claimed a free birthday dessert!`,
//   'birthday'
// );
//   return order;
// };


const claimFreeOrder = async (userId: string, productId: string, pickupTime: string, uberQuoteId?: string, uberFee?: number) => {
  const user = await UserModel.findById(userId);
  if (!user?.canClaimBirthdayReward) {
    throw new AppError(httpStatus.BAD_REQUEST, "Please click the claim button in the popup first!");
  }

  const product = await ProductModel.findById(productId).populate('category');
  if (!product) throw new AppError(httpStatus.NOT_FOUND, "Product not found");

  const category = product.category as any;
  if (category?.categoryName?.toLowerCase() !== 'desert') {
    throw new AppError(httpStatus.BAD_REQUEST, "Birthday gift is only available for Desserts!");
  }

 
  const deliveryFee = uberFee || 0;
  const totalAmount = deliveryFee; 

  // create pending order
  const order = await OrderModel.create({
    user: userId,
    orderType: uberQuoteId ? OrderType.DELIVERY : OrderType.PICKUP,
    items: [{
      product: product._id,
      name: product.name,
      price: 0,
      quantity: 1,
      total: 0,
      points: 0
    }],
    subtotal: 0,
    deliveryFee: deliveryFee,
    totalAmount: totalAmount,
    paymentStatus: PaymentStatus.PENDING, 
    paymentMethod: PaymentMethod.CARD,
    orderStatus: OrderStatus.ONGOING,
    customerEmail: user.email,
    customerName: `${user.firstName} ${user.lastName}`,
    pickupTime,
    uberQuoteId,
    uberFee,
    notes: "Birthday Free Dessert Reward"
  });


  if (totalAmount > 0) {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'payment',
      customer_email: user.email,
      line_items: [{
        price_data: {
          currency: 'usd',
          product_data: { name: `Delivery fee for Birthday Gift: ${product.name}` },
          unit_amount: Math.round(totalAmount * 100),
        },
        quantity: 1,
      }],
      metadata: { 
        orderId: order._id.toString(), 
        type: 'birthday_reward' 
      },
      success_url: `${config.frontend_url}/order/success?session_id={CHECKOUT_SESSION_ID}&order=${order.orderNumber}`,
      cancel_url: `${config.frontend_url}/order/cancel`,
    });

    order.stripeSessionId = session.id;
    await order.save();
    return { url: session.url };
  } else {
    
    await handleBirthdaySuccess(order._id.toString());
    return { message: "Order placed successfully", order };
  }
};


const handleBirthdaySuccess = async (orderId: string) => {
  const order = await OrderModel.findById(orderId);
  if (!order) return;

  order.paymentStatus = PaymentStatus.PAID;
  await order.save();
// validate for claim 1 time only
  await UserModel.findByIdAndUpdate(order.user, { 
    canClaimBirthdayReward: false,
    lastBirthdayRewardYear: new Date().getFullYear()
  });

  // dispatch uber rider
  if (order.uberQuoteId) {
    const uberRes = await UberService.createUberDeliveryOrder(order, order.uberQuoteId);
    if (uberRes) {
      order.uberDeliveryId = uberRes.deliveryId;
      order.uberTrackingUrl = uberRes.tracking_url;
      await order.save();
    }
  }

  await sendNotification(order.user.toString(), 'Birthday Gift Confirmed! 🎂', 'Your free dessert order is confirmed.');

  
};



export const BirthdayService = { checkEligibility, activateClaimStatus, claimFreeOrder,handleBirthdaySuccess };