import httpStatus from 'http-status';
import AppError from '../../errors/AppError';
import { UserModel } from '../User/user.model';
import { ProductModel } from '../product/product.model';
import { OrderModel } from '../Orders/orders.model';
import { OrderStatus, OrderType, PaymentMethod, PaymentStatus } from '../Orders/orders.interface';

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


const activateClaimStatus = async (userId: string) => {
  const eligibility = await checkEligibility(userId);
  if (!eligibility.isBirthday) throw new AppError(httpStatus.BAD_REQUEST, "Today is not your birthday!");

  return await UserModel.findByIdAndUpdate(userId, { canClaimBirthdayReward: true }, { new: true });
};

const claimFreeOrder = async (userId: string, productId: string, pickupTime: string) => {
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

  const order = await OrderModel.create({
    user: userId,
    orderType: OrderType.PICKUP,
    items: [{
      product: product._id,
      name: product.name,
      price: 0,
      quantity: 1,
      total: 0,
      points: 0
    }],
    subtotal: 0,      
    totalAmount: 0,
    deliveryFee: 0,  
    paymentStatus: PaymentStatus.PAID,
    paymentMethod: PaymentMethod.POINTS,
    orderStatus: OrderStatus.ONGOING,
    customerEmail: user.email,
    customerName: `${user.firstName} ${user.lastName}`,
    pickupTime,
    notes: "Birthday Free Dessert Reward"
  });


  await UserModel.findByIdAndUpdate(userId, { 
    canClaimBirthdayReward: false,
    lastBirthdayClaimYear: new Date().getFullYear()
  });

  return order;
};

export const BirthdayService = { checkEligibility, activateClaimStatus, claimFreeOrder };