import httpStatus from 'http-status';
import mongoose from 'mongoose';
import AppError from '../../errors/AppError';
import { RewardModel } from './reward.model';
import { UserModel } from '../User/user.model';
import {
  IAddPointsInput,
  IUsePointsInput,
  IRewardSummary,
  IHistoryFilters,
  PointTransactionType,
  PointSource,
  IRewardDocument,
} from './reward.interface';

const DEFAULT_VALIDITY_DAYS = 365; // 1 year validity

// ═══════════════════════════════════════════════════════════════════════
// GET OR CREATE REWARD DOCUMENT
// ═══════════════════════════════════════════════════════════════════════
const getOrCreateReward = async (userId: string): Promise<IRewardDocument> => {
  let reward = await RewardModel.findOne({ user: userId });
  
  if (!reward) {
    reward = await RewardModel.create({
      user: userId,
      totalEarned: 0,
      totalUsed: 0,
      totalExpired: 0,
      currentBalance: 0,
      pointEntries: [],
      history: [],
    });
  }
  
  return reward;
};

// ═══════════════════════════════════════════════════════════════════════
// CHECK AND EXPIRE OLD POINTS
// ═══════════════════════════════════════════════════════════════════════
const checkAndExpirePoints = async (userId: string): Promise<IRewardDocument> => {
  const reward = await getOrCreateReward(userId);
  const now = new Date();
  let totalExpiredNow = 0;

  for (const entry of reward.pointEntries) {
    // Check if entry should expire
    if (!entry.isExpired && !entry.isFullyUsed && entry.expiresAt <= now && entry.remainingPoints > 0) {
      const expiredPoints = entry.remainingPoints;
      
      entry.isExpired = true;
      entry.remainingPoints = 0;
      totalExpiredNow += expiredPoints;

      // Add to history
      reward.history.push({
        type: PointTransactionType.EXPIRED,
        points: expiredPoints,
        source: entry.source,
        orderId: entry.orderId,
        orderNumber: entry.orderNumber,
        description: `${expiredPoints} points expired from ${entry.source === PointSource.ORDER ? `order ${entry.orderNumber}` : entry.source}`,
        createdAt: now,
        balanceAfter: reward.currentBalance - expiredPoints,
      });

      // Update balance after each history entry
      reward.currentBalance -= expiredPoints;
    }
  }

  if (totalExpiredNow > 0) {
    reward.totalExpired += totalExpiredNow;
    
    // Also update user's point field for consistency
    await UserModel.findByIdAndUpdate(userId, {
      $inc: { point: -totalExpiredNow }
    });
    
    await reward.save();
    console.log(`⏰ Expired ${totalExpiredNow} points for user ${userId}`);
  }

  return reward;
};

// ═══════════════════════════════════════════════════════════════════════
// ADD POINTS (Called when order is delivered)
// ═══════════════════════════════════════════════════════════════════════
const addPoints = async (input: IAddPointsInput): Promise<IRewardDocument> => {
  const { 
    userId, 
    points, 
    source, 
    orderId, 
    orderNumber, 
    validityDays = DEFAULT_VALIDITY_DAYS, 
    description 
  } = input;

  if (points <= 0) {
    throw new AppError(httpStatus.BAD_REQUEST, 'Points must be greater than 0');
  }

  // First check for expired points
  await checkAndExpirePoints(userId);

  const reward = await getOrCreateReward(userId);
  const now = new Date();
  const expiresAt = new Date(now.getTime() + validityDays * 24 * 60 * 60 * 1000);

  // Add point entry
  reward.pointEntries.push({
    points,
    remainingPoints: points,
    source,
    orderId: orderId ? new mongoose.Types.ObjectId(orderId) : undefined,
    orderNumber,
    earnedAt: now,
    expiresAt,
    isFullyUsed: false,
    isExpired: false,
  });

  // Update totals
  reward.totalEarned += points;
  reward.currentBalance += points;

  // Add to history
  reward.history.push({
    type: PointTransactionType.EARNED,
    points,
    source,
    orderId: orderId ? new mongoose.Types.ObjectId(orderId) : undefined,
    orderNumber,
    description: description || `Earned ${points} points from ${source === PointSource.ORDER ? `order ${orderNumber}` : source}`,
    createdAt: now,
    balanceAfter: reward.currentBalance,
  });

  await reward.save();
  
  console.log(`✅ Added ${points} points for user ${userId}, expires ${expiresAt.toDateString()}`);

  return reward;
};

// ═══════════════════════════════════════════════════════════════════════
// USE POINTS (Called during checkout or redemption)
// ═══════════════════════════════════════════════════════════════════════
const usePoints = async (input: IUsePointsInput): Promise<IRewardDocument> => {
  const { userId, points, orderId, orderNumber, description } = input;

  if (points <= 0) {
    throw new AppError(httpStatus.BAD_REQUEST, 'Points must be greater than 0');
  }

  // First check for expired points
  await checkAndExpirePoints(userId);

  const reward = await getOrCreateReward(userId);

  if (reward.currentBalance < points) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      `Insufficient points. Available: ${reward.currentBalance}, Requested: ${points}`
    );
  }

  const now = new Date();
  let remainingToUse = points;

  // Use points from oldest entries first (FIFO - First In First Out)
  const activeEntries = reward.pointEntries
    .filter(e => !e.isExpired && !e.isFullyUsed && e.remainingPoints > 0)
    .sort((a, b) => new Date(a.earnedAt).getTime() - new Date(b.earnedAt).getTime());

  for (const entry of activeEntries) {
    if (remainingToUse <= 0) break;

    const toUseFromEntry = Math.min(entry.remainingPoints, remainingToUse);

    entry.remainingPoints -= toUseFromEntry;
    
    if (entry.remainingPoints <= 0) {
      entry.isFullyUsed = true;
    }

    remainingToUse -= toUseFromEntry;
  }

  // Update totals
  reward.totalUsed += points;
  reward.currentBalance -= points;

  // Also update user's point field
  await UserModel.findByIdAndUpdate(userId, {
    $inc: { point: -points }
  });

  // Add to history
  reward.history.push({
    type: PointTransactionType.USED,
    points,
    orderId: orderId ? new mongoose.Types.ObjectId(orderId) : undefined,
    orderNumber,
    description: description || `Used ${points} points${orderNumber ? ` for order ${orderNumber}` : ''}`,
    createdAt: now,
    balanceAfter: reward.currentBalance,
  });

  await reward.save();
  
  console.log(`💳 Used ${points} points for user ${userId}`);

  return reward;
};

// ═══════════════════════════════════════════════════════════════════════
// REFUND POINTS (If order is cancelled after points were used)
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
    validityDays: DEFAULT_VALIDITY_DAYS,
  });
};

// ═══════════════════════════════════════════════════════════════════════
// GET REWARD SUMMARY
// ═══════════════════════════════════════════════════════════════════════
const getRewardSummary = async (userId: string): Promise<IRewardSummary> => {
  // First check for expired points
  await checkAndExpirePoints(userId);

  const reward = await getOrCreateReward(userId);
  const now = new Date();

  // Get points expiring within next 30 days
  const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
  
  const expiringPoints = reward.pointEntries
    .filter(e => 
      !e.isExpired && 
      !e.isFullyUsed && 
      e.remainingPoints > 0 &&
      e.expiresAt <= thirtyDaysFromNow &&
      e.expiresAt > now
    )
    .map(e => ({
      amount: e.remainingPoints,
      expiresAt: e.expiresAt,
      daysLeft: Math.ceil((e.expiresAt.getTime() - now.getTime()) / (24 * 60 * 60 * 1000)),
    }))
    .sort((a, b) => a.daysLeft - b.daysLeft);

  return {
    currentBalance: reward.currentBalance,
    totalEarned: reward.totalEarned,
    totalUsed: reward.totalUsed,
    totalExpired: reward.totalExpired,
    expiringPoints,
  };
};

// ═══════════════════════════════════════════════════════════════════════
// GET POINT HISTORY WITH FILTERS
// ═══════════════════════════════════════════════════════════════════════
const getPointHistory = async (userId: string, filters: IHistoryFilters) => {
  // First check for expired points
  await checkAndExpirePoints(userId);

  const reward = await getOrCreateReward(userId);
  
  let history = [...reward.history];
  
  // Filter by type (earned, used, expired)
  if (filters.type) {
    history = history.filter(h => h.type === filters.type);
  }
  
  // Filter by date range
  if (filters.startDate) {
    const startDate = new Date(filters.startDate);
    history = history.filter(h => new Date(h.createdAt) >= startDate);
  }
  
  if (filters.endDate) {
    const endDate = new Date(filters.endDate);
    endDate.setHours(23, 59, 59, 999);
    history = history.filter(h => new Date(h.createdAt) <= endDate);
  }
  
  // Sort by date (newest first)
  history.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  
  // Pagination
  const page = filters.page || 1;
  const limit = filters.limit || 20;
  const skip = (page - 1) * limit;
  
  const paginatedHistory = history.slice(skip, skip + limit);
  
  // Calculate type-wise totals
  const earnedHistory = reward.history.filter(h => h.type === PointTransactionType.EARNED);
  const usedHistory = reward.history.filter(h => h.type === PointTransactionType.USED);
  const expiredHistory = reward.history.filter(h => h.type === PointTransactionType.EXPIRED);

  return {
    history: paginatedHistory,
    pagination: {
      page,
      limit,
      total: history.length,
      totalPages: Math.ceil(history.length / limit),
    },
    summary: {
      earned: reward.totalEarned,
      used: reward.totalUsed,
      expired: reward.totalExpired,
      currentBalance: reward.currentBalance,
    },
    counts: {
      earnedTransactions: earnedHistory.length,
      usedTransactions: usedHistory.length,
      expiredTransactions: expiredHistory.length,
    }
  };
};

// ═══════════════════════════════════════════════════════════════════════
// GET DETAILED REWARD INFO
// ═══════════════════════════════════════════════════════════════════════
const getDetailedReward = async (userId: string) => {
  await checkAndExpirePoints(userId);
  
  const reward = await RewardModel.findOne({ user: userId })
    .populate('user', 'firstName lastName email image')
    .populate('pointEntries.orderId', 'orderNumber totalAmount')
    .populate('history.orderId', 'orderNumber totalAmount');
    
  if (!reward) {
    return {
      user: null,
      currentBalance: 0,
      totalEarned: 0,
      totalUsed: 0,
      totalExpired: 0,
      pointEntries: [],
      history: [],
    };
  }
  
  // Separate active and expired/used entries
  const activeEntries = reward.pointEntries.filter(
    e => !e.isExpired && !e.isFullyUsed && e.remainingPoints > 0
  );
  
  const expiredEntries = reward.pointEntries.filter(e => e.isExpired);
  const usedEntries = reward.pointEntries.filter(e => e.isFullyUsed);
  
  return {
    ...reward.toObject(),
    activePointEntries: activeEntries,
    expiredPointEntries: expiredEntries,
    fullyUsedEntries: usedEntries,
  };
};

// ═══════════════════════════════════════════════════════════════════════
// CRON JOB: PROCESS EXPIRED POINTS FOR ALL USERS
// ═══════════════════════════════════════════════════════════════════════
const processExpiredPointsForAllUsers = async () => {
  const now = new Date();
  
  const rewards = await RewardModel.find({
    'pointEntries': {
      $elemMatch: {
        isExpired: false,
        isFullyUsed: false,
        remainingPoints: { $gt: 0 },
        expiresAt: { $lte: now }
      }
    }
  });

  let totalProcessed = 0;
  
  for (const reward of rewards) {
    await checkAndExpirePoints(reward.user.toString());
    totalProcessed++;
  }

  console.log(`⏰ Processed expired points for ${totalProcessed} users`);
  
  return { processedUsers: totalProcessed };
};

// ═══════════════════════════════════════════════════════════════════════
// CHECK IF USER HAS ENOUGH POINTS
// ═══════════════════════════════════════════════════════════════════════
const hasEnoughPoints = async (userId: string, requiredPoints: number): Promise<boolean> => {
  await checkAndExpirePoints(userId);
  const reward = await getOrCreateReward(userId);
  return reward.currentBalance >= requiredPoints;
};

// ═══════════════════════════════════════════════════════════════════════
// GET AVAILABLE POINTS FOR USER
// ═══════════════════════════════════════════════════════════════════════
const getAvailablePoints = async (userId: string): Promise<number> => {
  await checkAndExpirePoints(userId);
  const reward = await getOrCreateReward(userId);
  return reward.currentBalance;
};

export const RewardServices = {
  getOrCreateReward,
  checkAndExpirePoints,
  addPoints,
  usePoints,
  refundPoints,
  getRewardSummary,
  getPointHistory,
  getDetailedReward,
  processExpiredPointsForAllUsers,
  hasEnoughPoints,
  getAvailablePoints,
};