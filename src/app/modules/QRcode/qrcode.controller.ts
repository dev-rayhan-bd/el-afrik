import { Request, Response } from 'express';
import catchAsync from '../../utils/catchAsync';
import sendResponse from '../../utils/sendResponse';
import httpStatus from 'http-status';
import { QRCodeServices } from './qrcode.services';

const generateQR = catchAsync(async (req: Request, res: Response) => {
  const result = await QRCodeServices.createQRCode(req.body);
  sendResponse(res, { statusCode: httpStatus.CREATED, success: true, message: 'QR Code generated', data: result });
});

const claimQR = catchAsync(async (req: Request, res: Response) => {
  const { code } = req.body;
  const result = await QRCodeServices.claimQRCodePoints(req.user.userId, code);
  sendResponse(res, { statusCode: httpStatus.OK, success: true, message: 'Points added successfully', data: result });
});

const getCodes = catchAsync(async (req: Request, res: Response) => {
  const result = await QRCodeServices.getAllQRCodes(req.query);
  sendResponse(res, { statusCode: httpStatus.OK, success: true, message: 'QR Codes fetched', data: result });
});

export const QRCodeController = { generateQR, claimQR, getCodes };