// c:\STA\El-afrik\src\app\modules\Orders\pointRedemption.services.ts

import httpStatus from 'http-status';
import mongoose from 'mongoose';
import AppError from '../../errors/AppError';

import { ProductModel } from '../product/product.model';
import { UserModel } from '../User/user.model';
import { RewardServices } from '../Reward/reward.services';
import {
  IOrderItem,
  IPointRedemptionInput,
  OrderStatus,
  OrderType,
  PaymentStatus,
  PaymentMethod,
} from '../Orders/orders.interface';
import sendEmail from '../../utils/sendEmail';
import config from '../../config';
import { OrderModel } from '../Orders/orders.model';
import Stripe from 'stripe';

const stripe = new Stripe(config.stripe_secret_key as string);
// ═══════════════════════════════════════════════════════════════════════
// GET REDEEMABLE PRODUCTS
// ═══════════════════════════════════════════════════════════════════════
const getRedeemableProducts = async (
  query: Record<string, unknown>,
  userId?: string
) => {
  const page = Number(query.page) || 1;
  const limit = Number(query.limit) || 20;
  const skip = (page - 1) * limit;

  const filter: any = {
    points: { $gt: 0 },
    quantity: { $gt: 0 },
    status: 'in_stock',
  };

  if (query.category) {
    filter.category = new mongoose.Types.ObjectId(query.category as string);
  }

  if (query.maxPoints) {
    filter.points = { $gt: 0, $lte: Number(query.maxPoints) };
  }

  const products = await ProductModel.find(filter)
    .populate('category', 'name')
    .skip(skip)
    .limit(limit)
    .sort({ points: 1 });

  const total = await ProductModel.countDocuments(filter);

  let availablePoints = 0;
  if (userId) {
    availablePoints = await RewardServices.getAvailablePoints(userId);
  }

  const productsWithRedeemInfo = products.map((product) => {
    const productObj = product.toObject();
    return {
      ...productObj,
      pointsRequired: product.points,
      canRedeem: userId ? availablePoints >= product.points : undefined,
    };
  });

  return {
    products: productsWithRedeemInfo,
    availablePoints: userId ? availablePoints : undefined,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
};

// ═══════════════════════════════════════════════════════════════════════
// CALCULATE REDEMPTION COST
// ═══════════════════════════════════════════════════════════════════════
const calculateRedemptionCost = async (
  items: { productId: string; quantity: number }[],
  userId?: string
) => {
  let totalPointsRequired = 0;
  let totalMonetaryValue = 0;
  const itemDetails: any[] = [];

  for (const item of items) {
    const product = await ProductModel.findById(item.productId);

    if (!product) {
      throw new AppError(
        httpStatus.NOT_FOUND,
        `Product ${item.productId} not found`
      );
    }

    if (product.points <= 0) {
      throw new AppError(
        httpStatus.BAD_REQUEST,
        `${product.name} is not available for point redemption (no points value)`
      );
    }

    if (product.quantity < item.quantity) {
      throw new AppError(
        httpStatus.BAD_REQUEST,
        `Insufficient stock for ${product.name}. Available: ${product.quantity}`
      );
    }

    const pointsPerItem = product.points;
    const totalPointsForItem = pointsPerItem * item.quantity;
    const price = product.discountedPrice || product.price;
    const monetaryValue = price * item.quantity;

    totalPointsRequired += totalPointsForItem;
    totalMonetaryValue += monetaryValue;

    itemDetails.push({
      productId: product._id,
      name: product.name,
      image: product.images?.[0],
      price,
      quantity: item.quantity,
      pointsPerItem,
      totalPoints: totalPointsForItem,
      monetaryValue: parseFloat(monetaryValue.toFixed(2)),
    });
  }

  let availablePoints = 0;
  let canRedeem = false;
  let pointsShortfall = 0;

  if (userId) {
    availablePoints = await RewardServices.getAvailablePoints(userId);
    canRedeem = availablePoints >= totalPointsRequired;
    pointsShortfall = canRedeem ? 0 : totalPointsRequired - availablePoints;
  }

  return {
    items: itemDetails,
    totalPointsRequired,
    totalMonetaryValue: parseFloat(totalMonetaryValue.toFixed(2)),
    availablePoints,
    canRedeem,
    pointsShortfall,
  };
};

// ═══════════════════════════════════════════════════════════════════════
// PURCHASE WITH POINTS
// ═══════════════════════════════════════════════════════════════════════
// const purchaseWithPoints = async (input: IPointRedemptionInput) => {
//   const { userId, items, deliveryType, shippingAddress, pickupTime, notes,uberQuoteId, uberFee } =
//     input;

//   const user = await UserModel.findById(userId);
//   if (!user) {
//     throw new AppError(httpStatus.NOT_FOUND, 'User not found');
//   }
//   const fullName = user.fullName || `${user.firstName} ${user.lastName}`;
//   if (deliveryType === 'delivery' && !shippingAddress) {
//     throw new AppError(
//       httpStatus.BAD_REQUEST,
//       'Shipping address is required for delivery'
//     );
//   }

//   await RewardServices.checkAndExpirePoints(userId);

//   const costCalculation = await calculateRedemptionCost(items, userId);

//   if (!costCalculation.canRedeem) {
//     throw new AppError(
//       httpStatus.BAD_REQUEST,
//       `Insufficient points. Required: ${costCalculation.totalPointsRequired}, Available: ${costCalculation.availablePoints}`
//     );
//   }

//   const totalPointsRequired = costCalculation.totalPointsRequired;

//   const orderItems: IOrderItem[] = costCalculation.items.map((item) => ({
//     product: item.productId,
//     name: item.name,
//     image: item.image,
//     price: item.price,
//     quantity: item.quantity,
//     total: item.monetaryValue,
//     points: 0,
//     pointsCost: item.totalPoints,
//   }));

//   const order = await OrderModel.create({
//     user: userId,
//     items: orderItems,
//     subtotal: costCalculation.totalMonetaryValue,
//     deliveryFee: 0,
//     discount: costCalculation.totalMonetaryValue,
//     totalAmount: 0,
//     totalPoints: 0,
//     pointsUsed: totalPointsRequired,
//     pointsValue: costCalculation.totalMonetaryValue,
//     orderType: OrderType.POINT_REDEMPTION,
//     orderStatus: OrderStatus.ONGOING,
//     paymentStatus: PaymentStatus.POINTS_PAID,
//     paymentMethod: PaymentMethod.POINTS,
//     customerEmail: user.email,
//     customerName: fullName,
//     customerPhone: user.contact,
//     shippingAddress: deliveryType === 'delivery' ? shippingAddress : undefined,
//     pickupTime: deliveryType === 'pickup' ? pickupTime : undefined,
//     redemptionDeliveryType: deliveryType,
//     paidAt: new Date(),
//     pointsAdded: true,
//     notes,
//     statusHistory: [
//       {
//         status: OrderStatus.ONGOING,
//         timestamp: new Date(),
//         note: `Redeemed with ${totalPointsRequired} points (${deliveryType})`,
//       },
//     ],
//   });

//   await RewardServices.redeemPoints({
//     userId,
//     points: totalPointsRequired,
//     orderId: order._id.toString(),
//     orderNumber: order.orderNumber,
//     description: `Redeemed ${items.length} item(s) using ${totalPointsRequired} points`,
//   });

// for (const item of items) {

//   const product = await ProductModel.findByIdAndUpdate(
//     item.productId,
//     { $inc: { quantity: -item.quantity } },
//     { new: true }
//   );


//   if (product && product.quantity <= 0) {
//     await ProductModel.findByIdAndUpdate(item.productId, {
//       $set: { status: 'out_of_stock', quantity: 0 }
//     });
//   }
// }

//   await sendRedemptionConfirmationEmail(order, user);

//   console.log(
//     `🎁 Point redemption order created: ${order.orderNumber} for ${totalPointsRequired} points`
//   );

//   const remainingPoints =
//     costCalculation.availablePoints - totalPointsRequired;

//   return {
//     success: true,
//     order: {
//       _id: order._id,
//       orderNumber: order.orderNumber,
//       items: orderItems.map((item) => ({
//         name: item.name,
//         quantity: item.quantity,
//         pointsCost: item.pointsCost,
//       })),
//       pointsUsed: totalPointsRequired,
//       monetaryValue: costCalculation.totalMonetaryValue,
//       deliveryType,
//       orderStatus: order.orderStatus,
//       createdAt: order.createdAt,
//     },
//     remainingPoints,
//     message: `Successfully redeemed with ${totalPointsRequired} points!`,
//   };
// };
const purchaseWithPoints = async (input: IPointRedemptionInput) => {
  const { userId, items, deliveryType, shippingAddress, pickupTime, notes, uberQuoteId, uberFee } = input;

  const user = await UserModel.findById(userId);
  if (!user) throw new AppError(httpStatus.NOT_FOUND, 'User not found');

  const fullName = user.fullName || `${user.firstName} ${user.lastName}`;


  const costCalculation = await calculateRedemptionCost(items, userId);
  if (!costCalculation.canRedeem) {
    throw new AppError(httpStatus.BAD_REQUEST, `Insufficient points.`);
  }

  const totalPointsRequired = costCalculation.totalPointsRequired;

 
  const orderItems: IOrderItem[] = costCalculation.items.map((item) => ({
    product: item.productId,
    name: item.name,
    image: item.image,
    price: 0,
    quantity: item.quantity,
    total: 0,
    points: 0,
    pointsCost: item.totalPoints,
  }));


  let stripeUrl = null;
  let paymentStatus = PaymentStatus.POINTS_PAID; 

  if (deliveryType === 'delivery') {
    if (!uberFee || uberFee <= 0) {
      throw new AppError(httpStatus.BAD_REQUEST, 'Delivery fee is required for delivery orders');
    }
    paymentStatus = PaymentStatus.PENDING;
  }

  // (Database-এ)
  const order = await OrderModel.create({
    user: userId,
    items: orderItems,
    subtotal: 0,
    deliveryFee: uberFee || 0,
    totalAmount: uberFee || 0, 
    pointsUsed: totalPointsRequired,
    orderType: OrderType.POINT_REDEMPTION,
    orderStatus: OrderStatus.ONGOING,
    paymentStatus: paymentStatus,
    paymentMethod: PaymentMethod.POINTS, 
    customerEmail: user.email,
    customerName: fullName,
    customerPhone: user.contact,
    shippingAddress: deliveryType === 'delivery' ? shippingAddress : undefined,
    pickupTime: deliveryType === 'pickup' ? pickupTime : undefined,
    redemptionDeliveryType: deliveryType,
    uberQuoteId,
    uberFee,
    notes,
  });

  if (deliveryType === 'delivery') {
     if (uberFee === undefined || uberFee === null) {
    throw new AppError(httpStatus.BAD_REQUEST, 'Delivery fee is required for delivery orders');
  }
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'payment',
      customer_email: user.email,
      line_items: [{
        price_data: {
          currency: 'cad',
          product_data: { 
            name: `Delivery Fee for Point Redemption`,
            description: `Items: ${items.length} (Paid via Points)`
          },
          unit_amount: Math.round(uberFee * 100) ,
        },
        quantity: 1,
      }],
      metadata: { 
        orderId: order._id.toString(), 
        type: 'point_redemption_delivery' 
      },
      success_url: `${config.server_url}/payment-success?session_id={CHECKOUT_SESSION_ID}&order=${order.orderNumber}`,
      cancel_url: `${config.server_url}/payment-cancel`,
    });

    order.stripeSessionId = session.id;
    await order.save();
    stripeUrl = session.url;

    return {
      success: true,
      stripeUrl, 
      message: 'Please pay the delivery fee to complete your redemption.'
    };
  }

 
  await RewardServices.redeemPoints({
    userId,
    points: totalPointsRequired,
    orderId: order._id.toString(),
    orderNumber: order.orderNumber,
    description: `Redeemed items using ${totalPointsRequired} points`,
  });

  // স্টক আপডেট
  for (const item of items) {
    await ProductModel.findByIdAndUpdate(item.productId, { $inc: { quantity: -item.quantity } });
  }

  await sendRedemptionConfirmationEmail(order, user);

  return {
    success: true,
    order,
    message: `Successfully redeemed with ${totalPointsRequired} points!`,
  };
};
// ═══════════════════════════════════════════════════════════════════════
// GET MY REDEMPTION ORDERS
// ═══════════════════════════════════════════════════════════════════════
const getMyRedemptionOrders = async (
  userId: string,
  filters: { status?: string },
  pagination: { page: number; limit: number }
) => {
  const { page = 1, limit = 10 } = pagination;
  const skip = (page - 1) * limit;

  const query: any = {
    user: userId,
    orderType: OrderType.POINT_REDEMPTION,
  };

  if (filters.status) {
    query.orderStatus = filters.status;
  }

  const [orders, total] = await Promise.all([
    OrderModel.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('items.product', 'name images points'),
    OrderModel.countDocuments(query),
  ]);

  return {
    orders,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
};

// ═══════════════════════════════════════════════════════════════════════
// GET SINGLE REDEMPTION ORDER
// ═══════════════════════════════════════════════════════════════════════
const getRedemptionOrderById = async (orderId: string, userId: string) => {
  const order = await OrderModel.findOne({
    _id: orderId,
    user: userId,
    orderType: OrderType.POINT_REDEMPTION,
  })
    .populate('items.product', 'name images points')
    .populate('user', 'firstName lastName email');

  if (!order) {
    throw new AppError(httpStatus.NOT_FOUND, 'Redemption order not found');
  }

  return order;
};

// ═══════════════════════════════════════════════════════════════════════
// CANCEL REDEMPTION ORDER
// ═══════════════════════════════════════════════════════════════════════
const cancelRedemptionOrder = async (
  orderId: string,
  userId: string,
  reason?: string
) => {
  const order = await OrderModel.findOne({
    _id: orderId,
    user: userId,
    orderType: OrderType.POINT_REDEMPTION,
  });

  if (!order) {
    throw new AppError(httpStatus.NOT_FOUND, 'Redemption order not found');
  }

  if (order.orderStatus !== OrderStatus.ONGOING) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      `Cannot cancel order with status "${order.orderStatus}"`
    );
  }

  order.orderStatus = OrderStatus.CANCELLED;
  order.cancelledAt = new Date();
  order.statusHistory.push({
    status: OrderStatus.CANCELLED,
    timestamp: new Date(),
    note: reason || 'Cancelled by customer',
  });

  await order.save();

  if (order.pointsUsed > 0) {
    await RewardServices.refundPoints(
      userId,
      order.pointsUsed,
      order._id.toString(),
      order.orderNumber
    );

    await UserModel.findByIdAndUpdate(userId, {
      $inc: { point: order.pointsUsed },
    });
  }

  for (const item of order.items) {
    await ProductModel.findByIdAndUpdate(item.product, {
      $inc: { quantity: item.quantity },
    });
  }

  // console.log(
  //   `❌ Redemption order ${order.orderNumber} cancelled. ${order.pointsUsed} points refunded.`
  // );

  const currentPoints = await RewardServices.getAvailablePoints(userId);

  return {
    order,
    pointsRefunded: order.pointsUsed,
    currentBalance: currentPoints,
    message: `Order cancelled. ${order.pointsUsed} points have been refunded.`,
  };
};

// ═══════════════════════════════════════════════════════════════════════
// HELPER: Send Redemption Confirmation Email
// ═══════════════════════════════════════════════════════════════════════
async function sendRedemptionConfirmationEmail(order: any, user: any) {
  try {
    const itemsList = order.items
      .map(
        (item: any) =>
          `• ${item.name} x${item.quantity} - ${item.pointsCost} points`
      )
      .join('\n');

    const deliveryInfo =
      order.redemptionDeliveryType === 'pickup'
        ? `Pickup Time: ${order.pickupTime || 'To be confirmed'}`
        : `Delivery Address: ${order.shippingAddress?.line1 || ''}, ${order.shippingAddress?.city || ''}`;

    await sendEmail({
      from: config.SMTP_USER as string,
      to: user.email,
      subject: `🎁 Points Redemption Confirmed - ${order.orderNumber}`,
      text: `
Congratulations! Your points redemption order is confirmed!

Order Number: ${order.orderNumber}
${deliveryInfo}

Items Redeemed:
${itemsList}

Total Points Used: ${order.pointsUsed} points
Value: $${order.pointsValue.toFixed(2)}

We'll notify you when your order is ready.

Thank you for being a loyal customer!
      `,
    });
  } catch (error) {
    console.error('Failed to send redemption confirmation email:', error);
  }
}

export const PointRedemptionService = {
  getRedeemableProducts,
  calculateRedemptionCost,
  purchaseWithPoints,
  getMyRedemptionOrders,
  getRedemptionOrderById,
  cancelRedemptionOrder,
   sendRedemptionConfirmationEmail,
};