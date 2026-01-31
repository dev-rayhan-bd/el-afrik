import { Request, Response } from 'express';
import catchAsync from '../../utils/catchAsync';
import sendResponse from '../../utils/sendResponse';
import httpStatus from 'http-status';
import { BirthdayService } from './birthday.services';

const checkStatus = catchAsync(async (req: Request, res: Response) => {
  const result = await BirthdayService.checkEligibility(req.user.userId);
  sendResponse(res, { statusCode: httpStatus.OK, success: true, message: 'Status fetched', data: result });
});

const activateClaim = catchAsync(async (req: Request, res: Response) => {
  const result = await BirthdayService.activateClaimStatus(req.user.userId);
  sendResponse(res, { statusCode: httpStatus.OK, success: true, message: 'Reward activated', data: result });
});

const placeClaimOrder = catchAsync(async (req: Request, res: Response) => {
  const { productId, pickupTime,uberQuoteId, uberFee,  shippingAddress } = req.body;
  const result = await BirthdayService.claimFreeOrder(req.user.userId, productId, pickupTime,uberQuoteId, uberFee,shippingAddress);
  sendResponse(res, { statusCode: httpStatus.CREATED, success: true, message: 'Order placed successfully', data: result });
});

export const BirthdayController = { checkStatus, activateClaim, placeClaimOrder };