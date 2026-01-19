import {  Request, Response } from 'express';
import httpStatus from 'http-status';
import catchAsync from '../../utils/catchAsync';
import sendResponse from '../../utils/sendResponse';
import { CartServices } from './cart.services';


// Get all items from the cart
const getAllItemsFromCart = catchAsync(async (req: Request, res: Response) => {
  const  userId  = req?.user?.userId; 
  const result = await CartServices.getAllItemsFromCart(userId);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Cart items retrieved successfully!',
    data: result,
  });
});

// Get a single item from the cart
const getSingleItemFromCart = catchAsync(async (req: Request, res: Response) => {
  const { productId } = req.params;
    const  userId  = req?.user?.userId; 
  const result = await CartServices.getSingleItemFromCart(userId, productId);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Cart item retrieved successfully!',
    data: result,
  });
});

// Add an item to the cart
const addItemToCart = catchAsync(async (req: Request, res: Response) => {
  const  userId  = req?.user?.userId; 
  const { productId, quantity } = req.body;

  const result = await CartServices.addItemToCart(userId, productId, quantity);

  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: 'Item added to cart successfully!',
    data: result,
  });
});

// Update item quantity in the cart
const updateCartItem = catchAsync(async (req: Request, res: Response) => {
      const  userId  = req?.user?.userId; 
  const {productId } = req.params;
  const { quantity } = req.body;

  const result = await CartServices.updateCartItem(userId, productId, quantity);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Cart item updated successfully!',
    data: result,
  });
});

// Remove an item from the cart
const removeItemFromCart = catchAsync(async (req: Request, res: Response) => {
      const  userId  = req?.user?.userId; 
  const { productId } = req.params;

  const result = await CartServices.removeItemFromCart(userId, productId);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Item removed from cart successfully!',
    data: result,
  });
});

// Clear the entire cart
const clearCart = catchAsync(async (req: Request, res: Response) => {
   const  userId  = req?.user?.userId; 

  const result = await CartServices.clearCart(userId);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Cart cleared successfully!',
    data: result,
  });
});

export const cartControllers = {
  getAllItemsFromCart,
  getSingleItemFromCart,
  addItemToCart,
  updateCartItem,
  removeItemFromCart,
  clearCart,
};
