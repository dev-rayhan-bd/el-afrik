import { Request, Response } from 'express';
import catchAsync from '../../utils/catchAsync';
import sendResponse from '../../utils/sendResponse';
import httpStatus from 'http-status';
import { NotificationModel } from './notification.model';
import AppError from '../../errors/AppError';

const getMyNotifications = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user.userId;


  const result = await NotificationModel.find({ user: userId })
    .sort({ createdAt: -1 });

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Notifications retrieved successfully',
    data: result,
  });
});


const markAsRead = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user.userId;
  
  await NotificationModel.updateMany(
    { user: userId, isRead: false },
    { isRead: true }
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'All notifications marked as read',
    data: null,
  });
});

const markSingleAsRead = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params; 
  const userId = req.user.userId;

  const result = await NotificationModel.findOneAndUpdate(
    { _id: id, user: userId },
    { isRead: true },
    { new: true }
  );

  if (!result) {
    throw new AppError(httpStatus.NOT_FOUND, 'Notification not found');
  }

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Notification marked as read',
    data: result,
  });
});


export const NotificationController = { getMyNotifications, markAsRead,markSingleAsRead };