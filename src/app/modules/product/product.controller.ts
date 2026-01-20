import { NextFunction, Request, Response } from 'express';



import httpStatus from 'http-status';
import catchAsync from '../../utils/catchAsync';

import sendResponse from '../../utils/sendResponse';
import { ProductServices } from './product.services';
import uploadImage from '../../middleware/upload';





const getAllProduct = catchAsync(async(req:Request,res:Response)=>{

 const userId = req.user?.userId; 

  const result = await ProductServices.getAllProductFromDB(req.query, userId);
  sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: 'Product retrived succesfully!',
      data: result,
    });

})
const getSingleProduct = catchAsync(async(req:Request,res:Response)=>{
  const { id } = req.params;
 const userId = req.user?.userId; 

  const result = await ProductServices.getSingleProductFromDB(id, userId);
  sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: 'Product retrived succesfully!',
      data: result,
    });

})


const createProduct = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const files = req.files as {
      [fieldname: string]: Express.Multer.File[];
    };

   


    const imageFiles = files?.image || [];


    const uploadedUrls = await Promise.all(
      imageFiles.map((file) => uploadImage(req, file))
    );
    const body = req.body || {};

    const payload = {
      ...body,
      images: uploadedUrls,

    };
  try {
    const result = await  ProductServices.addProductIntoDB(payload);

    sendResponse(res, {
      success: true,
      message: 'Product Created Successfull',
      statusCode: httpStatus.CREATED,
      data: result,
    });
  } catch (err) {
    next(err);
  }
};
const createReview = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
//   console.log("create revieew-->",req.body);
  try {
    const result = await ProductServices.addReviewIntoDB(req.body);

    sendResponse(res, {
      success: true,
      message: 'Review Sent Successfull',
      statusCode: httpStatus.CREATED,
      data: result,
    });
  } catch (err) {
    next(err);
  }
};

const deleteProduct = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;

  const result = await ProductServices.deleteProductFromDB(id);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Product deleted successfully!',
    data: result,
  });
})

const editProduct = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    const files = req.files as { [fieldname: string]: Express.Multer.File[] };

    const imageFiles = files?.image || [];
  
    let uploadedUrls: string[] = [];
    
    if (imageFiles.length > 0) {
      uploadedUrls = await Promise.all(
        imageFiles.map((file) => uploadImage(req, file))
      );
    }

    const body = req.body || {};

    const payload = {
      ...body,
      images: uploadedUrls.length > 0 ? uploadedUrls : undefined,  
    };

    // Update the product in the database
    const result = await ProductServices.updateProductFromDB(id, payload);

    sendResponse(res, {
      success: true,
      message: `Product updated successfully`,
      statusCode: httpStatus.OK,
      data: result,
    });
  } catch (err) {
    next(err);
  }
};


export const ProductControllers = {
getAllProduct,getSingleProduct,createProduct,deleteProduct,editProduct,createReview
};
