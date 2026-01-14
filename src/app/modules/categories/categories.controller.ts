import { NextFunction, Request, Response } from 'express';



import httpStatus from 'http-status';
import catchAsync from '../../utils/catchAsync';

import sendResponse from '../../utils/sendResponse';

import uploadImage from '../../middleware/upload';
import { CategoryServices } from './categories.services';





const getAllCategories = catchAsync(async(req:Request,res:Response)=>{

  const result = await CategoryServices.getAllActivitiesFromDB(req?.query);
  sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: 'Activity retrived succesfully!',
      data: result,
    });

})
const getSingleCategories = catchAsync(async(req:Request,res:Response)=>{
  const { id } = req.params;
  const result = await CategoryServices.getSingleActivitiesFromDB(id);
  sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: 'Category retrived succesfully!',
      data: result,
    });

})


const createCategories = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
//   console.log("create revieew-->",req.body);
//   const path = `${req.protocol}://${req.get('host')}/uploads/${req.file?.filename}`;
const payload = req.body
// payload.image = path

    if (req.file) {
      const imageUrl = await uploadImage(req); // S3 URL 
      payload.image = imageUrl;
    }

payload.user = req?.user?.userId
  try {
    const result = await  CategoryServices.addActivitiesIntoDB(payload);

    sendResponse(res, {
      success: true,
      message: 'Category Created Successfull',
      statusCode: httpStatus.CREATED,
      data: result,
    });
  } catch (err) {
    next(err);
  }
};
const editCategory = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { id } = req.params;
    const payload = req.body;
    
    //  Only add image to payload if uploaded
    // if (req.file?.filename) {
    //   payload.image = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`;
    // }
     if (req.file) {
      const imageUrl = await uploadImage(req);
      payload.image = imageUrl;
    }

    const result = await CategoryServices.updateActivitiesFromDB(id, payload);
    
    sendResponse(res, {
      success: true,
      message: `Category updated Successfully`,
      statusCode: httpStatus.OK,
      data: result,
    });
  } catch (err) {
    next(err);
  }
};
const deleteCategories= catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;

  const result = await CategoryServices.deleteActivitiesFromDB(id);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Category deleted successfully!',
    data: result,
  });
})



export const categoriesControllers = {
createCategories,getAllCategories,getSingleCategories,deleteCategories,editCategory

};
