import httpStatus from 'http-status';
import AppError from '../../errors/AppError';
import { ProductModel } from '../product/product.model';
import { WishlistModel } from './wishlist.model';

const addToWishlist = async (userId: string, productId: string) => {
  // Check if product exists
  const product = await ProductModel.findById(productId);
  if (!product) {
    throw new AppError(httpStatus.NOT_FOUND, 'Product not found');
  }


  // Add product to wishlist using $addToSet to avoid duplicates
  const result = await WishlistModel.findOneAndUpdate(
    { user: userId },
    { $addToSet: { products: productId } },
    { upsert: true, new: true }
  );

  return result;
};

const removeFromWishlist = async (userId: string, productId: string) => {
  const result = await WishlistModel.findOneAndUpdate(
    { user: userId },
    { $pull: { products: productId } },
    { new: true }
  );

  if (!result) {
    throw new AppError(httpStatus.NOT_FOUND, 'Wishlist not found');
  }

  return result;
};
const clearWishlist = async (userId: string, productId: string) => {
  const result = await WishlistModel.findOneAndDelete({ user: userId });

  if (!result) {
    throw new AppError(httpStatus.NOT_FOUND, 'Wishlist not found');
  }

  return result;
};

const getMyWishlist = async (userId: string) => {
  const result = await WishlistModel.findOne({ user: userId }).populate('products','name images price discountedPrice weight');
  return result;
};

export const WishlistServices = {
  addToWishlist,
  removeFromWishlist,
  getMyWishlist,
  clearWishlist
};