import AppError from '../../errors/AppError';
import httpStatus from 'http-status';
import { CartModel } from './cart.model';

import { ProductModel } from '../product/product.model';
import mongoose from 'mongoose';

// Get all items in the user's cart
const getAllItemsFromCart = async (userId: string) => {
  const cart = await CartModel.findOne({ user: userId }).populate('items.product');

  if (!cart) {
    return {
      user: userId,
      items: [], 
      subtotal: 0
    };
  }

  return cart;
};

// Get a single item from the cart
const getSingleItemFromCart = async (userId: string, productId: string) => {
  const cart = await CartModel.findOne({ user: userId });

  if (!cart) {
    throw new AppError(httpStatus.NOT_FOUND, 'Cart item not found!');
  }

  const item = cart.items.find(item => item.product.toString() === productId);

  if (!item) {
    throw new AppError(httpStatus.NOT_FOUND, 'Item not found in cart!');
  }

  return item;
};

// Add an item to the cart
const addItemToCart = async (userId: string, productId: string, quantity: number) => {
  // Find the product by productId
  const product = await ProductModel.findById(productId);
  if (!product) {
    throw new AppError(httpStatus.NOT_FOUND, 'Product not found!');
  }

  // Calculate the total for this item (based on quantity and price/discounted price)
  let total = product.discountedPrice 
    ? product.discountedPrice * quantity 
    : product.price * quantity;

  // Round total to 2 decimal places
  total = parseFloat(total.toFixed(2));

  // Find the cart for the user
  let cart = await CartModel.findOne({ user: userId });

  if (!cart) {
    // If no cart exists, create a new one
    cart = new CartModel({
      user: userId,
      items: [{ product: new mongoose.Types.ObjectId(productId), quantity, total }],
      subtotal: total,  
    });
  } else {
    // If the cart exists, check if the product is already in the cart
    const itemIndex = cart.items.findIndex(item => item.product.toString() === productId);

    if (itemIndex > -1) {
      // If the item exists in the cart, update the quantity and total
      const item = cart.items[itemIndex];
      item.quantity += quantity;
      item.total = parseFloat((item.quantity * (product.discountedPrice?product.discountedPrice : product.price)).toFixed(2));
    } else {
      // If the item doesn't exist, add it to the cart
      cart.items.push({ product: new mongoose.Types.ObjectId(productId), quantity, total });
    }

    // Recalculate the subtotal after adding or updating the item
    cart.subtotal = cart.items.reduce((subtotal, item) => subtotal + item.total, 0);
  }

  // Save the updated cart
  await cart.save();
  return cart;
};


// Update the quantity of an item in the cart
const updateCartItem = async (userId: string, productId: string, quantity: number) => {
  const cart = await CartModel.findOne({ user: userId });

  if (!cart) {
    throw new AppError(httpStatus.NOT_FOUND, 'Cart item not found!');
  }

  const product = await ProductModel.findById(productId);

  if (!product) {
    throw new AppError(httpStatus.NOT_FOUND, 'Product not found!');
  }

  const itemIndex = cart.items.findIndex(item => item.product.toString() === productId);

  if (itemIndex === -1) {
    throw new AppError(httpStatus.NOT_FOUND, 'Item not found in cart!');
  }

  let total
if(product?.discountedPrice){

     total = product.discountedPrice * quantity;
}else{
     total = product.price * quantity;

}
  const item = cart.items[itemIndex];
  item.quantity = quantity;
  item.total = total = parseFloat(total.toFixed(2));
  // Recalculate subtotal after updating the item
  cart.subtotal = cart.items.reduce((subtotal, item) => subtotal + item.total, 0);

  await cart.save();
  return cart;
};

// Remove an item from the cart
const removeItemFromCart = async (userId: string, productId: string) => {
  const cart = await CartModel.findOne({ user: userId });

  if (!cart) {
    throw new AppError(httpStatus.NOT_FOUND, 'Cart not found!');
  }

  const itemIndex = cart.items.findIndex(item => item.product.toString() === productId);

  if (itemIndex === -1) {
    throw new AppError(httpStatus.NOT_FOUND, 'Item not found in cart!');
  }

  const removedItem = cart.items.splice(itemIndex, 1)[0];

  // Recalculate subtotal after removing the item
  cart.subtotal -= removedItem.total;

  await cart.save();
  return cart;
};

// Clear the entire cart
const clearCart = async (userId: string) => {
  const cart = await CartModel.findOneAndDelete({ user: userId });

  if (!cart) {
    throw new AppError(httpStatus.NOT_FOUND, 'Cart not found!');
  }

  return cart;
};

export const CartServices = {
  getAllItemsFromCart,
  getSingleItemFromCart,
  addItemToCart,
  updateCartItem,
  removeItemFromCart,
  clearCart,
};
