import { Request, Response } from 'express';
import catchAsync from '../../utils/catchAsync';
import sendResponse from '../../utils/sendResponse';
import httpStatus from 'http-status';
import { CateringService } from './cateringBooking.services';
import uploadImage from '../../middleware/upload';

const addPackage = catchAsync(async (req: Request, res: Response) => {
  const payload = req.body;
  if (req.file) {
    payload.image = await uploadImage(req);
  }
  const result = await CateringService.addPackageIntoDB(payload);
  sendResponse(res, { statusCode: httpStatus.CREATED, success: true, message: 'Package added', data: result });
});

const editPackage = catchAsync(async (req: Request, res: Response) => {
  const payload = req.body;
  if (req.file) {
    payload.image = await uploadImage(req);
  }
  const result = await CateringService.updatePackageInDB(req.params.id, payload);
  sendResponse(res, { statusCode: httpStatus.OK, success: true, message: 'Package updated', data: result });
});

const deletePackage = catchAsync(async (req: Request, res: Response) => {
  const result = await CateringService.deletePackageFromDB(req.params.id);
  sendResponse(res, { statusCode: httpStatus.OK, success: true, message: 'Package deleted', data: result });
});

const getPackages = catchAsync(async (req: Request, res: Response) => {

  const result = await CateringService.getAllPackagesFromDB(req.query);
  sendResponse(res, { statusCode: httpStatus.OK, success: true, message: 'Packages retrieved', data: result });
});

const createReservation = catchAsync(async (req: Request, res: Response) => {
  const result = await CateringService.createCheckoutSession(req.user.userId, { 
    ...req.body, 
    customerEmail: req.user.email 
  });
  sendResponse(res, { statusCode: httpStatus.OK, success: true, message: 'Payment URL generated', data: result });
});

const getAllBookings = catchAsync(async (req: Request, res: Response) => {

  const result = await CateringService.getAllBookings(req.query);
  sendResponse(res, { statusCode: httpStatus.OK, success: true, message: 'Bookings retrieved', data: result });
});

const getMyBookings = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user.userId;
  const result = await CateringService.getMyBookingsFromDB(userId, req.query);
  
  sendResponse(res, { 
    statusCode: httpStatus.OK, 
    success: true, 
    message: 'My bookings retrieved successfully', 
    data: result 
  });
});



const downloadInvoice = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const pdfDoc = await CateringService.generateInvoicePDF(id);

  // Set Response Headers for PDF Download
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename=invoice-${id}.pdf`);

  // Pipe the PDF document directly to the response
  pdfDoc.pipe(res);
});

export const CateringController = { 
  addPackage, 
  editPackage, 
  deletePackage, 
  getPackages, 
  createReservation, 
  getAllBookings ,
  downloadInvoice,getMyBookings
};