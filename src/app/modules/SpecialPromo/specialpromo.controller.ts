import { Request, Response } from 'express';
import httpStatus from 'http-status';
import catchAsync from '../../utils/catchAsync';
import sendResponse from '../../utils/sendResponse';
import { SpecialPromoServices } from './specialpromo.services';


const createSpecialPromo = catchAsync(async (req: Request, res: Response) => {
  const result = await SpecialPromoServices.createSpecialPromo(req.body);

  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: 'Special Promo created successfully',
    data: result,
  });
});

const getAllSpecialPromos = catchAsync(async (req: Request, res: Response) => {
  const result = await SpecialPromoServices.getAllSpecialPromos(req.query);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Special Promos retrieved successfully',
    data: result,
  });
});

const deleteSpecialPromo = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  await SpecialPromoServices.deleteSpecialPromo(id);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Special Promo deleted successfully',
    data: null,
  });
});

export const SpecialPromoControllers = {
  createSpecialPromo,
  getAllSpecialPromos,
  deleteSpecialPromo,
};