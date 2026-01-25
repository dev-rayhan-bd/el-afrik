// import AppError from '../../errors/AppError';

import AppError from "../../errors/AppError";

import httpStatus from "http-status";

import QueryBuilder from "../../builder/QueryBuilder";
import { ProductModel } from "./product.model";
import { IProduct, TReview } from "./product.interface";
import CategoryModel from "../categories/categories.model";
import { WishlistModel } from "../Wishlist/wishlist.model";
import mongoose from "mongoose";



const getAllProductFromDB = async (query: Record<string, unknown>, userId?: string) => {

  if (query.category) {
    query.category = new mongoose.Types.ObjectId(query.category as string);
  }

  const queryBuilder = new QueryBuilder(ProductModel.find().populate('category'), query);


  queryBuilder.search(["name", "description"]) .filter().paginate();
  
  const result = await queryBuilder.modelQuery;
  const meta = await queryBuilder.countTotal();

  let wishlistProductIds: string[] = [];
  if (userId) {
    const wishlist = await WishlistModel.findOne({ user: userId });
    if (wishlist) {
      wishlistProductIds = wishlist.products.map((id) => id.toString());
    }
  }

  const modifiedResult = result.map((product) => {
    const productObj = product.toObject();
    return {
      ...productObj,
      isFavourite: wishlistProductIds.includes(product._id.toString()),
    };
  });

  return { meta, result: modifiedResult };
};
// const getSingleProductFromDB = async (id: string, userId?: string) => {
//   const product = await ProductModel.findById(id);
//   if (!product) {
//     throw new AppError(httpStatus.NOT_FOUND, "Product is not found!");
//   }

//   let isFavourite = false;
//   if (userId) {
//     const wishlist = await WishlistModel.findOne({ user: userId });
//     if (wishlist) {
//       isFavourite = wishlist.products.includes(new mongoose.Types.ObjectId(id) as any);
//     }
//   }

//   const productObj = product.toObject();
//   return { ...productObj, isFavourite };
// };
const addProductIntoDB = async (payload: IProduct) => {
  console.log("product data->", payload.category);

  const categoryId = payload.category;
  const category = await CategoryModel.findById(categoryId);
  if (!category) {
    throw new AppError(httpStatus.NOT_FOUND, "This Category is not found!");
  }

  // Calculate discounted price if discount exists
  if (payload.discount) {
    const { discount_type, discount_amount } = payload.discount;
    let discountedPrice = payload.price;

    // Calculate discounted price based on discount type
    if (discount_type === 'percentage') {

      discountedPrice = payload.price - (payload.price * (discount_amount / 100));
    } else if (discount_type === 'fixed') {

      discountedPrice = payload.price - discount_amount;
    }


    discountedPrice = Math.max(discountedPrice, 0);


    payload.discountedPrice = discountedPrice;
  }

  // Create product in the database
  const result = await ProductModel.create(payload);

  return result;
};


const deleteProductFromDB = async (id: string) => {
  const product = await ProductModel.findByIdAndDelete(id);

  if (!product) {
    throw new AppError(httpStatus.NOT_FOUND, "Product is not found!");
  }

  return product;
};

const updateProductFromDB = async (id: string, payload: IProduct) => {
  console.log("payload");
  const updated = await ProductModel.findByIdAndUpdate(
    id,
    { $set: payload },
    { new: true, runValidators: true, context: "query" }
  );

  if (!updated) {
    throw new AppError(httpStatus.NOT_FOUND, "Product is not found!");
  }

  return updated;
};



const addReviewIntoDB = async (userId: string, productId: string, rating: number, comment?: string) => {
  const product = await ProductModel.findById(productId);
  if (!product) throw new AppError(httpStatus.NOT_FOUND, 'Product not found');

  //check user already given review or not if given then update previous review if not then add new review
  const existingReviewIndex = product.review.findIndex(
    (rev: any) => rev.user.toString() === userId
  );

  if (existingReviewIndex > -1) {

    product.review[existingReviewIndex].rating = rating;
    if (comment) product.review[existingReviewIndex].comment = comment;
  } else {

    product.review.push({ user: new mongoose.Types.ObjectId(userId), rating, comment } as any);
  }

  await product.save();
  return product;
};

const getSingleProductFromDB = async (id: string, userId?: string) => {
  const product = await ProductModel.findById(id);
  if (!product) {
    throw new AppError(httpStatus.NOT_FOUND, "Product is not found!");
  }

  // average ratiing 
  let averageRating = 0;
  if (product.review && product.review.length > 0) {
    const totalSum = product.review.reduce((acc, rev) => acc + rev.rating, 0);
    averageRating = parseFloat((totalSum / product.review.length).toFixed(1));
  }

  // check wishlist
  let isFavourite = false;
  if (userId) {
    const wishlist = await WishlistModel.findOne({ user: userId });
    if (wishlist) {
      isFavourite = wishlist.products.includes(new mongoose.Types.ObjectId(id) as any);
    }
  }

  const productObj = product.toObject();

  return { 
    ...productObj, 
    isFavourite, 
    totalRating: averageRating 
  };
};


const getProductRatingSummaryFromDB = async (productId: string) => {
  const product = await ProductModel.findById(productId);
  if (!product) {
    throw new AppError(httpStatus.NOT_FOUND, "Product not found!");
  }

  const totalRatings = product.review.length;
  const starCounts = {
    "5": 0,
    "4": 0,
    "3": 0,
    "2": 0,
    "1": 0
  };

  let totalSum = 0;


  product.review.forEach((rev) => {
    const rating = rev.rating.toString() as keyof typeof starCounts;
    if (starCounts[rating] !== undefined) {
      starCounts[rating]++;
    }
    totalSum += rev.rating;
  });

  const averageRating = totalRatings > 0 ? parseFloat((totalSum / totalRatings).toFixed(1)) : 0;


  const starPercentages = {
    "5": totalRatings > 0 ? Math.round((starCounts["5"] / totalRatings) * 100) : 0,
    "4": totalRatings > 0 ? Math.round((starCounts["4"] / totalRatings) * 100) : 0,
    "3": totalRatings > 0 ? Math.round((starCounts["3"] / totalRatings) * 100) : 0,
    "2": totalRatings > 0 ? Math.round((starCounts["2"] / totalRatings) * 100) : 0,
    "1": totalRatings > 0 ? Math.round((starCounts["1"] / totalRatings) * 100) : 0
  };

  return {
    averageRating,
    totalRatings,
    starCounts,
    starPercentages
  };
};









export const ProductServices = {
  getAllProductFromDB,
  getSingleProductFromDB,
  addProductIntoDB,
  deleteProductFromDB,
  updateProductFromDB,
  addReviewIntoDB,
  getProductRatingSummaryFromDB
};
