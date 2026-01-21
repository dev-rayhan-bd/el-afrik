import { Request, Response } from 'express';
import httpStatus from 'http-status';
import catchAsync from '../../utils/catchAsync';
import sendResponse from '../../utils/sendResponse';
import { RewardServices } from './reward.services';
import { PointTransactionType, PointSource } from './reward.interface';

// ═══════════════════════════════════════════════════════════════════════
// USER CONTROLLERS
// ═══════════════════════════════════════════════════════════════════════

// Get my reward summary
const getMyRewardSummary = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user.userId;
  
  const result = await RewardServices.getRewardSummary(userId);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Reward summary retrieved successfully',
    data: result,
  });
});

// Get my point history
const getMyPointHistory = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user.userId;
  const { type, startDate, endDate, page, limit } = req.query;

  const result = await RewardServices.getPointHistory(userId, {
    type: type as PointTransactionType,
    startDate: startDate as string,
    endDate: endDate as string,
    page: page ? Number(page) : 1,
    limit: limit ? Number(limit) : 20,
  });

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Point history retrieved successfully',
    data: result,
  });
});

// Get detailed reward info
const getMyDetailedReward = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user.userId;

  const result = await RewardServices.getDetailedReward(userId);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Detailed reward info retrieved successfully',
    data: result,
  });
});

// Get available points (for checkout)
const getMyAvailablePoints = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user.userId;

  const points = await RewardServices.getAvailablePoints(userId);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Available points retrieved successfully',
    data: { availablePoints: points },
  });
});

// ═══════════════════════════════════════════════════════════════════════
// ADMIN CONTROLLERS
// ═══════════════════════════════════════════════════════════════════════

// Get any user's reward
const getUserReward = catchAsync(async (req: Request, res: Response) => {
  const { userId } = req.params;

  const result = await RewardServices.getDetailedReward(userId);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'User reward retrieved successfully',
    data: result,
  });
});

// Get user's reward summary
const getUserRewardSummary = catchAsync(async (req: Request, res: Response) => {
  const { userId } = req.params;

  const result = await RewardServices.getRewardSummary(userId);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'User reward summary retrieved successfully',
    data: result,
  });
});

// Manually add bonus points
const addBonusPoints = catchAsync(async (req: Request, res: Response) => {
  const { userId, points, description, validityDays } = req.body;

  if (!userId || !points) {
    return sendResponse(res, {
      statusCode: httpStatus.BAD_REQUEST,
      success: false,
      message: 'userId and points are required',
      data: null,
    });
  }

  const result = await RewardServices.addPoints({
    userId,
    points: Number(points),
    source: PointSource.BONUS,
    description: description || `Bonus points added by admin`,
    validityDays: validityDays ? Number(validityDays) : 365,
  });

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: `${points} bonus points added successfully`,
    data: {
      currentBalance: result.currentBalance,
      totalEarned: result.totalEarned,
    },
  });
});

// Manually deduct points (for corrections)
const deductPoints = catchAsync(async (req: Request, res: Response) => {
  const { userId, points, reason } = req.body;

  if (!userId || !points) {
    return sendResponse(res, {
      statusCode: httpStatus.BAD_REQUEST,
      success: false,
      message: 'userId and points are required',
      data: null,
    });
  }

  const result = await RewardServices.usePoints({
    userId,
    points: Number(points),
    description: reason || `Points deducted by admin`,
  });

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: `${points} points deducted successfully`,
    data: {
      currentBalance: result.currentBalance,
      totalUsed: result.totalUsed,
    },
  });
});

// Process expired points (cron job endpoint)
const processExpiredPoints = catchAsync(async (req: Request, res: Response) => {
  const result = await RewardServices.processExpiredPointsForAllUsers();

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Expired points processed successfully',
    data: result,
  });
});

export const RewardControllers = {
  // User
  getMyRewardSummary,
  getMyPointHistory,
  getMyDetailedReward,
  getMyAvailablePoints,
  // Admin
  getUserReward,
  getUserRewardSummary,
  addBonusPoints,
  deductPoints,
  processExpiredPoints,
};