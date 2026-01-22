import httpStatus from 'http-status';
import AppError from '../../errors/AppError';
import { UserModel } from '../User/user.model';
import { ProductModel } from '../product/product.model';
import { OrderModel } from '../Orders/orders.model';
import { OrderStatus, OrderType, PaymentMethod, PaymentStatus } from '../Orders/orders.interface';

// ১. পপআপ দেখানোর জন্য চেক
const checkEligibility = async (userId: string) => {
  const user = await UserModel.findById(userId);
  if (!user) throw new AppError(httpStatus.NOT_FOUND, 'User not found');

  const today = new Date();
  const dob = new Date(user.dob);
  const currentYear = today.getFullYear();

  const isBirthday = today.getMonth() === dob.getMonth() && today.getDate() === dob.getDate();
  const alreadyFinishedClaim = user.lastBirthdayRewardYear === currentYear;

  // পপআপ দেখাবে যদি আজ জন্মদিন হয় এবং সে এখনো ক্লেইম প্রসেস শুরু বা শেষ না করে থাকে
  const showPopup = isBirthday && !alreadyFinishedClaim && !user.canClaimBirthdayReward;

  return { isBirthday, canClaim: user.canClaimBirthdayReward, showPopup };
};

// ২. পপআপের 'Claim' বাটন ক্লিক করলে স্ট্যাটাস ট্রু করা
const activateClaimStatus = async (userId: string) => {
  const eligibility = await checkEligibility(userId);
  if (!eligibility.isBirthday) throw new AppError(httpStatus.BAD_REQUEST, "Today is not your birthday!");

  return await UserModel.findByIdAndUpdate(userId, { canClaimBirthdayReward: true }, { new: true });
};

// ৩. ফাইনাল অর্ডার (পিকআপ এবং ডেজার্ট ভ্যালিডেশন সহ)
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

  // অর্ডার তৈরি করার সময় subtotal: 0 যোগ করা হয়েছে
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
    subtotal: 0,      // এই ফিল্ডটি মিসিং ছিল, এখন অ্যাড করা হলো
    totalAmount: 0,
    deliveryFee: 0,   // সেফটির জন্য এটিও ০ করে দিন
    paymentStatus: PaymentStatus.PAID,
    paymentMethod: PaymentMethod.POINTS,
    orderStatus: OrderStatus.ONGOING,
    customerEmail: user.email,
    customerName: `${user.firstName} ${user.lastName}`,
    pickupTime,
    notes: "Birthday Free Dessert Reward"
  });

  // সফল হওয়ার পর রিসেট করা
  await UserModel.findByIdAndUpdate(userId, { 
    canClaimBirthdayReward: false,
    lastBirthdayClaimYear: new Date().getFullYear()
  });

  return order;
};

export const BirthdayService = { checkEligibility, activateClaimStatus, claimFreeOrder };