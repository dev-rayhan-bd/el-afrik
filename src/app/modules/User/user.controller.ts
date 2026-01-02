
import {Request, Response } from 'express';

import { UserServices } from './user.services';
import httpStatus from 'http-status';

import {

  TEditProfile,

} from './user.constant';
import catchAsync from '../../utils/catchAsync';
import sendResponse from '../../utils/sendResponse';
import uploadImage from '../../middleware/upload';




const updateProfile = catchAsync(async (req: Request, res: Response) => {
  console.log("req.user",req.user);
  const id = req?.user?.userId
  const payload: TEditProfile = { ...req.body };


  // if (req.file) {
  //   const imageUrl = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`;
  //   payload.image = imageUrl;
  // }
  
      if (req.file) {
      const imageUrl = await uploadImage(req)
      payload.image = imageUrl;
    }

  console.log("payload----->", payload);

  const result = await UserServices.updateProfileFromDB(id, payload);
  console.log("result--->", result);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Profile updated successfully',
    data: result,
  });
});

const getDashboardStats = catchAsync(async (req: Request, res: Response) => {

const {year} = req.params
  const result = await UserServices.getDashboardStatsFromDB(Number(year)); 

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Dashboard stats retrive successfully!',
    data: result,
  });
});
const getMyProfile = catchAsync(async (req: Request, res: Response) => {

const meId = req?.user?.userId
  const result = await UserServices.getMyProfileFromDB(meId);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Profile retrive successfully!',
    data: result,
  });
});

const updateScreenTimeData = catchAsync(async (req: Request, res: Response) => {
  console.log("req.user",req.user);
  const userId = req?.user?.userId
  const payload: any = { ...req.body };


  console.log("payload----->", payload);

  const result = await UserServices.updateScreenTimeData(userId, payload);
  console.log("result--->", result);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Screen time data updated successfully',
    data: result,
  });
});

const updateMovementData = catchAsync(async (req: Request, res: Response) => {
  console.log("req.user",req.user);
  const userId = req?.user?.userId
  const payload: any = { ...req.body };


  console.log("payload----->", payload);

  const result = await UserServices.updateScreenTimeData(userId, payload);
  console.log("result--->", result);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Screen time data updated successfully',
    data: result,
  });
});





export const UserControllers = {

  updateProfile,
getDashboardStats,
getMyProfile,
updateMovementData,
updateScreenTimeData
};
