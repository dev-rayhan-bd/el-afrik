import { Request, Response } from 'express';
import httpStatus from 'http-status';
import catchAsync from '../../utils/catchAsync';
import sendResponse from '../../utils/sendResponse';
import { RewardServices } from './reward.services';

const getMyRewardSummary = catchAsync(async (req: Request, res: Response) => {
  const result = await RewardServices.getRewardSummary(req.user.userId);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Summary retrieved',
    data: result,
  });
});

const getMyPointHistory = catchAsync(async (req: Request, res: Response) => {
  const result = await RewardServices.getPointHistory(req.user.userId, req.query);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'History retrieved',
    data: result,
  });
});

export const RewardControllers = {
  getMyRewardSummary,
  getMyPointHistory,
};