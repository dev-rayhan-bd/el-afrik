import { NextFunction, Request, Response } from 'express';



import httpStatus from 'http-status';
import catchAsync from '../../utils/catchAsync';

import sendResponse from '../../utils/sendResponse';
import { ProductServices } from './product.services';
import uploadImage from '../../middleware/upload';





const getAllProduct = catchAsync(async(req:Request,res:Response)=>{

  const result = await ProductServices.getAllProductFromDB(req?.query);
  sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: 'Product retrived succesfully!',
      data: result,
    });

})
const getSingleProduct = catchAsync(async(req:Request,res:Response)=>{
  const { id } = req.params;
  const result = await ProductServices.getSingleProductFromDB(id);
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

    //  Make sure the files exist
    console.log("req.files --->", files);


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
  next: NextFunction,
) => {
//   console.log("create revieew-->",req.body);
  try {
 
  const {id} = req.params;
  const path = `${req.protocol}://${req.get('host')}/uploads/${req.file?.filename}`;
const payload = req.body;
payload.image = path;


    // console.log("Data with file paths: ", data);
    
    const result = await ProductServices.updateProductFromDB(id,payload)
    sendResponse(res, {
      success: true,
      message: `Product updated Succesfull`,
      statusCode: httpStatus.OK,
      data: result,
    });
  } catch (err) {
    next(err);
  }
};

export const FaqControllers = {
getAllProduct,getSingleProduct,createProduct,deleteProduct,editProduct
};
