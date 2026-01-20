import { Request, Response } from 'express';
import httpStatus from 'http-status';
import catchAsync from '../../utils/catchAsync';
import sendResponse from '../../utils/sendResponse';
import { WishlistServices } from './wishlist.services';

const addToWishlist = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user.userId;
  const { productId } = req.params;

  const result = await WishlistServices.addToWishlist(userId, productId);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Product added to wishlist successfully',
    data: result,
  });
});

const removeFromWishlist = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user.userId;
  const { productId } = req.params;

  const result = await WishlistServices.removeFromWishlist(userId, productId);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Product removed from wishlist successfully',
    data: result,
  });
});
const removeWishlist = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user.userId;
  const { productId } = req.params;

  const result = await WishlistServices.clearWishlist(userId, productId);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'All Product removed from wishlist successfully',
    data: result,
  });
});

const getMyWishlist = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user.userId;
  const result = await WishlistServices.getMyWishlist(userId);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Wishlist retrieved successfully',
    data: result,
  });
});

export const WishlistControllers = {
  addToWishlist,
  removeFromWishlist,
  getMyWishlist,
  removeWishlist
};