// import AppError from '../../errors/AppError';

import AppError from "../../errors/AppError";

import httpStatus from "http-status";

import QueryBuilder from "../../builder/QueryBuilder";
import { ProductModel } from "./product.model";
import { IProduct, TReview } from "./product.interface";
import CategoryModel from "../categories/categories.model";

const getAllProductFromDB = async (query: Record<string, unknown>) => {
  const queryBuilder = new QueryBuilder(ProductModel.find(), query);

  // Ensure sorting by price if 'sort' query is passed as 'asc' or 'desc'
  if (query.sort === 'asc') {
    queryBuilder.sort('price', 1); // Ascending sort by price
  } else if (query.sort === 'desc') {
    queryBuilder.sort('price', -1); // Descending sort by price
  } else {
    queryBuilder.sort(); // Default sort, for example by 'createdAt'
  }

  queryBuilder.search(["name"]).filter().paginate();
  
  const result = await queryBuilder.modelQuery;
  const meta = await queryBuilder.countTotal();

  return { meta, result };
};


const getSingleProductFromDB = async (id: string) => {
  const result = await ProductModel.findById(id);
  return result;
};

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


export const addReviewIntoDB = async (payload: TReview) => {
  const { package_id, rating } = payload;

  // ...validate package_id, ensure package exists...

  const reviewDoc = {

    package_id,      // <-- add this because your schema requires it
    rating,

  };

  const updated = await ProductModel.findByIdAndUpdate(
    package_id,
    { $push: { review: reviewDoc } },
    { new: true, runValidators: true }
  );

  if (!updated) throw new AppError(httpStatus.INTERNAL_SERVER_ERROR, 'Failed to add review');
  return updated;
};



export const ProductServices = {
  getAllProductFromDB,
  getSingleProductFromDB,
  addProductIntoDB,
  deleteProductFromDB,
  updateProductFromDB,
  addReviewIntoDB
};
