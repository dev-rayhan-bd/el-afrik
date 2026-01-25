import { Request, Response } from 'express';
import catchAsync from '../../utils/catchAsync';
import sendResponse from '../../utils/sendResponse';
import httpStatus from 'http-status';
import { AdsServices } from './ads.services';
import uploadImage from '../../middleware/upload';

const createAds = catchAsync(async (req: Request, res: Response) => {
  let imageUrl: string = "";
  if (req.file) {
    imageUrl = await uploadImage(req);
  }

  const result = await AdsServices.createAdsIntoDB({ image: imageUrl });

  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: 'Ad posted successfully',
    data: result,
  });
});

const getAllAds = catchAsync(async (req: Request, res: Response) => {
  const result = await AdsServices.getAllAdsFromDB();
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Ads retrieved successfully',
    data: result,
  });
});

const deleteAds = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const result = await AdsServices.deleteAdsFromDB(id);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Ads deleted successfully',
    data: result,
  });
});

export const AdsControllers = { createAds, getAllAds, deleteAds };