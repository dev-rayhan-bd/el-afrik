// c:\STA\El-afrik\src\app\modules\Reward\reward.services.ts

import httpStatus from 'http-status';
import mongoose from 'mongoose';
import AppError from '../../errors/AppError';
import { RewardModel } from './reward.model';
import { UserModel } from '../User/user.model';
import {
  IAddPendingPointsInput,
  IClaimPointsInput,
  IRedeemPointsInput,
  IRewardSummary,
  IHistoryFilters,
  PointTransactionType,
  PointSource,
  PointStatus,
  IRewardDocument,
  IAddPointsInput,
  IUsePointsInput,
  IPointRedemptionResult,
} from './reward.interface';

const DEFAULT_VALIDITY_DAYS = 30;

// ═══════════════════════════════════════════════════════════════════════
// GET OR CREATE REWARD DOCUMENT
// ═══════════════════════════════════════════════════════════════════════
const getOrCreateReward = async (userId: string): Promise<IRewardDocument> => {
  let reward = await RewardModel.findOne({ user: userId });

  if (!reward) {
    reward = await RewardModel.create({
      user: userId,
      pendingPoints: 0,
      claimedPoints: 0,
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
  let pendingExpired = 0;
  let claimedExpired = 0;

  for (const entry of reward.pointEntries) {
    if (
      entry.status !== PointStatus.EXPIRED &&
      entry.status !== PointStatus.FULLY_USED &&
      entry.expiresAt <= now &&
      entry.remainingPoints > 0
    ) {
      const expiredPoints = entry.remainingPoints;
      const wasClaimedEntry =
        entry.status === PointStatus.CLAIMED ||
        entry.status === PointStatus.PARTIALLY_USED;
      const wasPendingEntry = entry.status === PointStatus.PENDING;

      entry.status = PointStatus.EXPIRED;
      entry.remainingPoints = 0;
      totalExpiredNow += expiredPoints;

      if (wasClaimedEntry) {
        claimedExpired += expiredPoints;
      }
      if (wasPendingEntry) {
        pendingExpired += expiredPoints;
      }

      reward.history.push({
        type: PointTransactionType.EXPIRED,
        points: expiredPoints,
        source: entry.source,
        orderId: entry.orderId,
        orderNumber: entry.orderNumber,
        description: `${expiredPoints} points expired from ${
          entry.source === PointSource.ORDER
            ? `order ${entry.orderNumber}`
            : entry.source
        }`,
        createdAt: now,
        balanceAfter: reward.currentBalance - (wasClaimedEntry ? expiredPoints : 0),
        relatedEntryId: entry._id,
      });
    }
  }

  if (totalExpiredNow > 0) {
    reward.totalExpired += totalExpiredNow;
    reward.pendingPoints -= pendingExpired;
    reward.claimedPoints -= claimedExpired;
    reward.currentBalance -= claimedExpired;

    if (claimedExpired > 0) {
      await UserModel.findByIdAndUpdate(userId, {
        $inc: { point: -claimedExpired },
      });
    }

    await reward.save();
    console.log(
      `⏰ Expired ${totalExpiredNow} points for user ${userId} (${pendingExpired} pending, ${claimedExpired} claimed)`
    );
  }

  return reward;
};

// ═══════════════════════════════════════════════════════════════════════
// ADD PENDING POINTS (Called when order payment is complete)
// ═══════════════════════════════════════════════════════════════════════
const addPendingPoints = async (
  input: IAddPendingPointsInput
): Promise<IRewardDocument> => {
  const {
    userId,
    points,
    source,
    orderId,
    orderNumber,
    validityDays = DEFAULT_VALIDITY_DAYS,
    description,
  } = input;

  if (points <= 0) {
    throw new AppError(httpStatus.BAD_REQUEST, 'Points must be greater than 0');
  }

  await checkAndExpirePoints(userId);

  const reward = await getOrCreateReward(userId);
  const now = new Date();
  const expiresAt = new Date(now.getTime() + validityDays * 24 * 60 * 60 * 1000);

  reward.pointEntries.push({
    points,
    remainingPoints: points,
    status: PointStatus.PENDING,
    source,
    orderId: orderId ? new mongoose.Types.ObjectId(orderId) : undefined,
    orderNumber,
    earnedAt: now,
    expiresAt,
    description: description || `Earned ${points} points from ${source}`,
  });

  reward.pendingPoints += points;

  reward.history.push({
    type: PointTransactionType.PENDING,
    points,
    source,
    orderId: orderId ? new mongoose.Types.ObjectId(orderId) : undefined,
    orderNumber,
    description:
      description ||
      `Earned ${points} points from ${
        source === PointSource.ORDER ? `order ${orderNumber}` : source
      } - awaiting claim`,
    createdAt: now,
    balanceAfter: reward.currentBalance,
  });

  await reward.save();

  console.log(
    `📦 Added ${points} PENDING points for user ${userId}, expires ${expiresAt.toDateString()}`
  );

  return reward;
};

// ═══════════════════════════════════════════════════════════════════════
// CLAIM POINTS (User claims their pending points)
// ═══════════════════════════════════════════════════════════════════════
const claimPoints = async (input: IClaimPointsInput): Promise<IRewardDocument> => {
  const { userId, entryId } = input;

  await checkAndExpirePoints(userId);

  const reward = await getOrCreateReward(userId);
  const now = new Date();
  let totalClaimed = 0;

  if (entryId) {
    const entry = reward.pointEntries.find(
      (e) => e._id?.toString() === entryId && e.status === PointStatus.PENDING
    );

    if (!entry) {
      throw new AppError(httpStatus.NOT_FOUND, 'Claimable reward entry not found');
    }

    if (entry.expiresAt <= now) {
      throw new AppError(httpStatus.BAD_REQUEST, 'This reward has expired');
    }

    entry.status = PointStatus.CLAIMED;
    entry.claimedAt = now;
    totalClaimed = entry.remainingPoints;

    reward.history.push({
      type: PointTransactionType.CLAIMED,
      points: totalClaimed,
      source: entry.source,
      orderId: entry.orderId,
      orderNumber: entry.orderNumber,
      description: `Claimed ${totalClaimed} points from ${
        entry.source === PointSource.ORDER
          ? `order ${entry.orderNumber}`
          : entry.source
      }`,
      createdAt: now,
      balanceAfter: reward.currentBalance + totalClaimed,
      relatedEntryId: entry._id,
    });
  } else {
    const pendingEntries = reward.pointEntries.filter(
      (e) => e.status === PointStatus.PENDING && e.expiresAt > now
    );

    if (pendingEntries.length === 0) {
      throw new AppError(httpStatus.BAD_REQUEST, 'No pending rewards to claim');
    }

    for (const entry of pendingEntries) {
      entry.status = PointStatus.CLAIMED;
      entry.claimedAt = now;
      totalClaimed += entry.remainingPoints;

      reward.history.push({
        type: PointTransactionType.CLAIMED,
        points: entry.remainingPoints,
        source: entry.source,
        orderId: entry.orderId,
        orderNumber: entry.orderNumber,
        description: `Claimed ${entry.remainingPoints} points from ${
          entry.source === PointSource.ORDER
            ? `order ${entry.orderNumber}`
            : entry.source
        }`,
        createdAt: now,
        balanceAfter: reward.currentBalance + totalClaimed,
        relatedEntryId: entry._id,
      });
    }
  }

  reward.pendingPoints -= totalClaimed;
  reward.claimedPoints += totalClaimed;
  reward.totalEarned += totalClaimed;
  reward.currentBalance += totalClaimed;

  await UserModel.findByIdAndUpdate(userId, {
    $inc: { point: totalClaimed },
  });

  await reward.save();

  console.log(
    `✅ User ${userId} claimed ${totalClaimed} points. New balance: ${reward.currentBalance}`
  );

  return reward;
};

// ═══════════════════════════════════════════════════════════════════════
// CLAIM ALL PENDING POINTS
// ═══════════════════════════════════════════════════════════════════════
const claimAllPoints = async (userId: string): Promise<IRewardDocument> => {
  return claimPoints({ userId });
};

// ═══════════════════════════════════════════════════════════════════════
// REDEEM POINTS (Use points to pay)
// ═══════════════════════════════════════════════════════════════════════
const redeemPoints = async (
  input: IRedeemPointsInput
): Promise<IPointRedemptionResult> => {
  const { userId, points, orderId, orderNumber, description } = input;

  if (points <= 0) {
    throw new AppError(httpStatus.BAD_REQUEST, 'Points must be greater than 0');
  }

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

  const claimedEntries = reward.pointEntries
    .filter(
      (e) =>
        (e.status === PointStatus.CLAIMED ||
          e.status === PointStatus.PARTIALLY_USED) &&
        e.remainingPoints > 0 &&
        e.expiresAt > now
    )
    .sort(
      (a, b) => new Date(a.earnedAt).getTime() - new Date(b.earnedAt).getTime()
    );

  for (const entry of claimedEntries) {
    if (remainingToUse <= 0) break;

    const toUseFromEntry = Math.min(entry.remainingPoints, remainingToUse);
    entry.remainingPoints -= toUseFromEntry;

    if (entry.remainingPoints <= 0) {
      entry.status = PointStatus.FULLY_USED;
    } else {
      entry.status = PointStatus.PARTIALLY_USED;
    }

    remainingToUse -= toUseFromEntry;
  }

  reward.totalUsed += points;
  reward.claimedPoints -= points;
  reward.currentBalance -= points;

  await UserModel.findByIdAndUpdate(userId, {
    $inc: { point: -points },
  });

  reward.history.push({
    type: PointTransactionType.USED,
    points,
    orderId: orderId ? new mongoose.Types.ObjectId(orderId) : undefined,
    orderNumber,
    description:
      description ||
      `Used ${points} points${orderNumber ? ` for order ${orderNumber}` : ''}`,
    createdAt: now,
    balanceAfter: reward.currentBalance,
  });

  await reward.save();

  console.log(`💳 User ${userId} used ${points} points`);

  return {
    pointsUsed: points,
    remainingBalance: reward.currentBalance,
  };
};

// ═══════════════════════════════════════════════════════════════════════
// USE POINTS (Backward compatible)
// ═══════════════════════════════════════════════════════════════════════
const usePoints = async (input: IUsePointsInput): Promise<IRewardDocument> => {
  await redeemPoints(input);
  return getOrCreateReward(input.userId);
};

// ═══════════════════════════════════════════════════════════════════════
// ADD POINTS (Direct add - for bonus/admin)
// ═══════════════════════════════════════════════════════════════════════
const addPoints = async (input: IAddPointsInput): Promise<IRewardDocument> => {
  const {
    userId,
    points,
    source,
    orderId,
    orderNumber,
    validityDays = DEFAULT_VALIDITY_DAYS,
    description,
  } = input;

  if (points <= 0) {
    throw new AppError(httpStatus.BAD_REQUEST, 'Points must be greater than 0');
  }

  await checkAndExpirePoints(userId);

  const reward = await getOrCreateReward(userId);
  const now = new Date();
  const expiresAt = new Date(now.getTime() + validityDays * 24 * 60 * 60 * 1000);

  reward.pointEntries.push({
    points,
    remainingPoints: points,
    status: PointStatus.CLAIMED,
    source,
    orderId: orderId ? new mongoose.Types.ObjectId(orderId) : undefined,
    orderNumber,
    earnedAt: now,
    claimedAt: now,
    expiresAt,
    description: description || `Bonus ${points} points`,
  });

  reward.claimedPoints += points;
  reward.totalEarned += points;
  reward.currentBalance += points;

  reward.history.push({
    type: PointTransactionType.EARNED,
    points,
    source,
    orderId: orderId ? new mongoose.Types.ObjectId(orderId) : undefined,
    orderNumber,
    description: description || `Added ${points} bonus points`,
    createdAt: now,
    balanceAfter: reward.currentBalance,
  });

  await UserModel.findByIdAndUpdate(userId, {
    $inc: { point: points },
  });

  await reward.save();

  console.log(`🎁 Added ${points} bonus points for user ${userId}`);

  return reward;
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
    validityDays: DEFAULT_VALIDITY_DAYS,
  });
};

// ═══════════════════════════════════════════════════════════════════════
// GET REWARD SUMMARY
// ═══════════════════════════════════════════════════════════════════════
const getRewardSummary = async (userId: string): Promise<IRewardSummary> => {
  await checkAndExpirePoints(userId);

  const reward = await getOrCreateReward(userId);
  const now = new Date();

  const claimableEntries = reward.pointEntries
    .filter((e) => e.status === PointStatus.PENDING && e.expiresAt > now)
    .map((e) => ({
      entryId: e._id!.toString(),
      points: e.remainingPoints,
      source: e.source,
      orderNumber: e.orderNumber,
      earnedAt: e.earnedAt,
      expiresAt: e.expiresAt,
      daysToExpire: Math.ceil(
        (e.expiresAt.getTime() - now.getTime()) / (24 * 60 * 60 * 1000)
      ),
    }))
    .sort((a, b) => a.daysToExpire - b.daysToExpire);

  const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

  const expiringPoints = reward.pointEntries
    .filter(
      (e) =>
        (e.status === PointStatus.CLAIMED ||
          e.status === PointStatus.PARTIALLY_USED) &&
        e.remainingPoints > 0 &&
        e.expiresAt <= thirtyDaysFromNow &&
        e.expiresAt > now
    )
    .map((e) => ({
      amount: e.remainingPoints,
      expiresAt: e.expiresAt,
      daysLeft: Math.ceil(
        (e.expiresAt.getTime() - now.getTime()) / (24 * 60 * 60 * 1000)
      ),
    }))
    .sort((a, b) => a.daysLeft - b.daysLeft);

  return {
    pendingPoints: reward.pendingPoints,
    claimedPoints: reward.claimedPoints,
    currentBalance: reward.currentBalance,
    totalEarned: reward.totalEarned,
    totalUsed: reward.totalUsed,
    totalExpired: reward.totalExpired,
    claimableEntries,
    expiringPoints,
  };
};

// ═══════════════════════════════════════════════════════════════════════
// GET POINT HISTORY WITH FILTERS
// ═══════════════════════════════════════════════════════════════════════
const getPointHistory = async (userId: string, filters: IHistoryFilters) => {
  await checkAndExpirePoints(userId);

  const reward = await getOrCreateReward(userId);

  let history = [...reward.history];

  if (filters.type) {
    history = history.filter((h) => h.type === filters.type);
  }

  if (filters.startDate) {
    const startDate = new Date(filters.startDate);
    history = history.filter((h) => new Date(h.createdAt) >= startDate);
  }

  if (filters.endDate) {
    const endDate = new Date(filters.endDate);
    endDate.setHours(23, 59, 59, 999);
    history = history.filter((h) => new Date(h.createdAt) <= endDate);
  }

  history.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  const page = filters.page || 1;
  const limit = filters.limit || 20;
  const skip = (page - 1) * limit;

  const paginatedHistory = history.slice(skip, skip + limit);

  return {
    history: paginatedHistory,
    pagination: {
      page,
      limit,
      total: history.length,
      totalPages: Math.ceil(history.length / limit),
    },
    summary: {
      pending: reward.pendingPoints,
      claimed: reward.claimedPoints,
      earned: reward.totalEarned,
      used: reward.totalUsed,
      expired: reward.totalExpired,
      currentBalance: reward.currentBalance,
    },
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
    const user = await UserModel.findById(userId).select(
      'firstName lastName email image'
    );
    return {
      user,
      pendingPoints: 0,
      claimedPoints: 0,
      currentBalance: 0,
      totalEarned: 0,
      totalUsed: 0,
      totalExpired: 0,
      pointEntries: [],
      history: [],
      pendingEntries: [],
      claimedEntries: [],
      usedEntries: [],
      expiredEntries: [],
    };
  }

  const now = new Date();

  const pendingEntries = reward.pointEntries.filter(
    (e) => e.status === PointStatus.PENDING && e.expiresAt > now
  );
  const claimedEntries = reward.pointEntries.filter(
    (e) =>
      (e.status === PointStatus.CLAIMED ||
        e.status === PointStatus.PARTIALLY_USED) &&
      e.remainingPoints > 0
  );
  const usedEntries = reward.pointEntries.filter(
    (e) => e.status === PointStatus.FULLY_USED
  );
  const expiredEntries = reward.pointEntries.filter(
    (e) => e.status === PointStatus.EXPIRED
  );

  const earnedHistory = reward.history.filter(
    (h) =>
      h.type === PointTransactionType.CLAIMED ||
      h.type === PointTransactionType.EARNED
  );
  const usedHistory = reward.history.filter(
    (h) => h.type === PointTransactionType.USED
  );
  const expiredHistory = reward.history.filter(
    (h) => h.type === PointTransactionType.EXPIRED
  );
  const pendingHistory = reward.history.filter(
    (h) => h.type === PointTransactionType.PENDING
  );

  return {
    ...reward.toObject(),
    pendingEntries,
    claimedEntries,
    usedEntries,
    expiredEntries,
    historyByType: {
      earned: earnedHistory,
      used: usedHistory,
      expired: expiredHistory,
      pending: pendingHistory,
    },
  };
};

// ═══════════════════════════════════════════════════════════════════════
// CRON JOB: PROCESS EXPIRED POINTS FOR ALL USERS
// ═══════════════════════════════════════════════════════════════════════
const processExpiredPointsForAllUsers = async () => {
  const now = new Date();

  const rewards = await RewardModel.find({
    pointEntries: {
      $elemMatch: {
        status: {
          $in: [
            PointStatus.PENDING,
            PointStatus.CLAIMED,
            PointStatus.PARTIALLY_USED,
          ],
        },
        remainingPoints: { $gt: 0 },
        expiresAt: { $lte: now },
      },
    },
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
const hasEnoughPoints = async (
  userId: string,
  requiredPoints: number
): Promise<boolean> => {
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
  addPendingPoints,
  claimPoints,
  claimAllPoints,
  redeemPoints,
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