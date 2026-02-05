import httpStatus from 'http-status';
import mongoose from 'mongoose';
import AppError from '../../errors/AppError';
import { RewardModel } from './reward.model';
import { UserModel } from '../User/user.model';
import { IAddPointsInput, IRedeemPointsInput, PointTransactionType, PointSource, PointStatus, IRewardDocument } from './reward.interface';

const DEFAULT_VALIDITY = 365; // 1 Year

const getOrCreateReward = async (userId: string): Promise<IRewardDocument> => {
  let reward = await RewardModel.findOne({ user: userId });
  if (!reward) {
    reward = await RewardModel.create({ user: userId, pointEntries: [], history: [] });
  }
  return reward;
};

// Auto Expiry Check
const checkAndExpirePoints = async (userId: string): Promise<IRewardDocument> => {
  const reward = await getOrCreateReward(userId);
  const now = new Date();
  let expiredCount = 0;

  for (const entry of reward.pointEntries) {
    if (entry.status === PointStatus.ACTIVE || entry.status === PointStatus.PARTIALLY_USED) {
      if (entry.expiresAt <= now && entry.remainingPoints > 0) {
        const amt = entry.remainingPoints;
        entry.status = PointStatus.EXPIRED;
        entry.remainingPoints = 0;
        expiredCount += amt;

        reward.history.push({
          type: PointTransactionType.EXPIRED,
          points: amt,
          description: `Points expired from ${entry.source}`,
          createdAt: now,
          balanceAfter: reward.currentBalance - expiredCount
        });
      }
    }
  }

  if (expiredCount > 0) {
    reward.currentBalance -= expiredCount;
    reward.totalExpired += expiredCount;
    await UserModel.findByIdAndUpdate(userId, { $inc: { point: -expiredCount } });
    await reward.save();
  }
  return reward;
};

// ADD POINTS (Auto Active)
const addPoints = async (input: IAddPointsInput): Promise<IRewardDocument> => {
  const { userId, points, source, orderId, orderNumber, validityDays = DEFAULT_VALIDITY, description } = input;
  if (points <= 0) return await getOrCreateReward(userId);

  const reward = await getOrCreateReward(userId);
  const now = new Date();
  const expiresAt = new Date(now.getTime() + validityDays * 24 * 60 * 60 * 1000);

  reward.pointEntries.push({
    points,
    remainingPoints: points,
    status: PointStatus.ACTIVE,
    source,
    orderId: orderId ? new mongoose.Types.ObjectId(orderId) : undefined,
    orderNumber,
    earnedAt: now,
    expiresAt,
    description
  });

  reward.currentBalance += points;
  reward.totalEarned += points;

  reward.history.push({
    type: source === PointSource.REFUND ? PointTransactionType.REFUNDED : PointTransactionType.EARNED,
    points,
    source,
    orderId: orderId ? new mongoose.Types.ObjectId(orderId) : undefined,
    orderNumber,
    description: description || `Points received from ${source}`,
    createdAt: now,
    balanceAfter: reward.currentBalance
  });

  await UserModel.findByIdAndUpdate(userId, { $inc: { point: points } });
  await reward.save();
  return reward;
};

// REDEEM POINTS (FIFO Logic)
const redeemPoints = async (input: IRedeemPointsInput) => {
  const { userId, points, orderId, orderNumber, description } = input;
  await checkAndExpirePoints(userId);
  const reward = await getOrCreateReward(userId);

  if (reward.currentBalance < points) {
    throw new AppError(httpStatus.BAD_REQUEST, 'Insufficient points');
  }

  let remainingToUse = points;
  const activeEntries = reward.pointEntries
    .filter(e => (e.status === PointStatus.ACTIVE || e.status === PointStatus.PARTIALLY_USED) && e.remainingPoints > 0)
    .sort((a, b) => a.expiresAt.getTime() - b.expiresAt.getTime()); // Use points expiring soon first

  for (const entry of activeEntries) {
    if (remainingToUse <= 0) break;
    const toTake = Math.min(entry.remainingPoints, remainingToUse);
    entry.remainingPoints -= toTake;
    entry.status = entry.remainingPoints === 0 ? PointStatus.FULLY_USED : PointStatus.PARTIALLY_USED;
    remainingToUse -= toTake;
  }

  reward.currentBalance -= points;
  reward.totalUsed += points;

  reward.history.push({
    type: PointTransactionType.USED,
    points,
    orderId: orderId ? new mongoose.Types.ObjectId(orderId) : undefined,
    orderNumber,
    description: description || `Used ${points} points for redemption`,
    createdAt: new Date(),
    balanceAfter: reward.currentBalance
  });

  await UserModel.findByIdAndUpdate(userId, { $inc: { point: -points } });
  await reward.save();
  return { pointsUsed: points, remainingBalance: reward.currentBalance };
};

const getRewardSummary = async (userId: string) => {
  await checkAndExpirePoints(userId);
  const reward = await getOrCreateReward(userId);
  return {
    currentBalance: reward.currentBalance,
    totalEarned: reward.totalEarned,
    totalUsed: reward.totalUsed,
    totalExpired: reward.totalExpired
  };
};

// const getPointHistory = async (userId: string, query: any) => {
//   await checkAndExpirePoints(userId);
  
 
//   const reward = await RewardModel.findOne({ user: userId })
//     .populate('history.orderId');

//   if (!reward) {
//     return {
//       history: [],
//       pagination: { page: 1, limit: 10, total: 0 },
//       summary: { currentBalance: 0, totalEarned: 0, totalUsed: 0, totalExpired: 0 }
//     };
//   }

//   // history sorted by desc
//   const history = [...reward.history].sort(
//     (a, b) => b.createdAt.getTime() - a.createdAt.getTime()
//   );
  
//   const page = Number(query.page) || 1;
//   const limit = Number(query.limit) || 10;
//   const skip = (page - 1) * limit;

//   return {
//     history: history.slice(skip, skip + limit),

//     summary: {
//       currentBalance: reward.currentBalance,
//       totalEarned: reward.totalEarned,
//       totalUsed: reward.totalUsed,
//       totalExpired: reward.totalExpired
//     },
//         pagination: { 
//       page, 
//       limit, 
//       total: history.length,
//       totalPages: Math.ceil(history.length / limit)
//     },
//   };
// };


const getPointHistory = async (userId: string, query: any) => {

  await checkAndExpirePoints(userId);

  const reward = await RewardModel.findOne({ user: userId })
    .populate('history.orderId');

  if (!reward) {
    return {
      history: [],
      pagination: { page: 1, limit: 10, total: 0 },
      summary: { currentBalance: 0, totalEarned: 0, totalUsed: 0, totalExpired: 0 }
    };
  }


  let filteredHistory = [...reward.history];


  if (query.type) {
    filteredHistory = filteredHistory.filter(
      (item) => item.type.toLowerCase() === query.type.toLowerCase()
    );
  }


  filteredHistory.sort(
    (a, b) => b.createdAt.getTime() - a.createdAt.getTime()
  );

  const page = Number(query.page) || 1;
  const limit = Number(query.limit) || 10;
  const skip = (page - 1) * limit;


  const paginatedHistory = filteredHistory.slice(skip, skip + limit);

  return {
    history: paginatedHistory,

    summary: {
      currentBalance: reward.currentBalance,
      totalEarned: reward.totalEarned,
      totalUsed: reward.totalUsed,
      totalExpired: reward.totalExpired
    },
    pagination: { 
      page, 
      limit, 
      total: filteredHistory.length, 
      totalPages: Math.ceil(filteredHistory.length / limit)
    },
  };
};


// ═══════════════════════════════════════════════════════════════════════
// REFUND POINTS
// ═══════════════════════════════════════════════════════════════════════
const refundPoints = async (
  userId: string,
  points: number,
  orderId?: string,
  orderNumber?: string
): Promise<IRewardDocument> => {
  return addPoints({
    userId,
    points,
    source: PointSource.REFUND,
    orderId,
    orderNumber,
    description: `Refunded ${points} points from cancelled order ${orderNumber || 'N/A'}`,
    validityDays:30
  });
};
export const RewardServices = {
  addPoints,
  redeemPoints,
  getRewardSummary,
  getPointHistory,
  getAvailablePoints: async (userId: string) => (await getOrCreateReward(userId)).currentBalance,refundPoints,
  checkAndExpirePoints
};