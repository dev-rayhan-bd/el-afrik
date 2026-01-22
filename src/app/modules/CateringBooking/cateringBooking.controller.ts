import { Request, Response } from 'express';
import catchAsync from '../../utils/catchAsync';
import sendResponse from '../../utils/sendResponse';
import httpStatus from 'http-status';
import { CateringService } from './cateringBooking.services';
import uploadImage from '../../middleware/upload';

const addPackage = catchAsync(async (req: Request, res: Response) => {
       const userPayload = req.body;
    // console.log("userpayload--->",userPayload);
       if (req.file) {
          const imageUrl = await uploadImage(req);
          userPayload.image = imageUrl;
        }
  const result = await CateringService.addPackageIntoDB(userPayload);
  sendResponse(res, { statusCode: httpStatus.CREATED, success: true, message: 'Package added', data: result });
});

const getPackages = catchAsync(async (req: Request, res: Response) => {
  const result = await CateringService.getAllPackagesFromDB();
  sendResponse(res, { statusCode: httpStatus.OK, success: true, message: 'Packages retrieved', data: result });
});

const createReservation = catchAsync(async (req: Request, res: Response) => {
  const result = await CateringService.createCheckoutSession(req.user.userId, { ...req.body, customerEmail: req.user.email });
  sendResponse(res, { statusCode: httpStatus.OK, success: true, message: 'Payment URL generated', data: result });
});

const confirmPayment = catchAsync(async (req: Request, res: Response) => {
  const result = await CateringService.confirmPaymentInDB(req.body.sessionId);
  sendResponse(res, { statusCode: httpStatus.OK, success: true, message: 'Booking confirmed', data: result });
});

const getAllBookings = catchAsync(async (req: Request, res: Response) => {
  const result = await CateringService.getAllBookings();
  sendResponse(res, { statusCode: httpStatus.OK, success: true, message: 'Bookings retrieved', data: result });
});

export const CateringController = { addPackage, getPackages, createReservation, confirmPayment, getAllBookings };