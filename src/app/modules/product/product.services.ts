// import AppError from '../../errors/AppError';

import AppError from "../../errors/AppError";

import httpStatus from "http-status";

import QueryBuilder from "../../builder/QueryBuilder";
import { ProductModel } from "./product.model";
import { IProduct, TReview } from "./product.interface";

const getAllProductFromDB = async (query: Record<string, unknown>) => {
  const queryBuilder = new QueryBuilder(ProductModel.find(), query);
  queryBuilder.search(["name"]).filter().sort().paginate();
  const result = await queryBuilder.modelQuery;
  const meta = await queryBuilder.countTotal();

  return { meta, result };
};

const getSingleProductFromDB = async (id: string) => {
  const result = await ProductModel.findById(id);
  return result;
};

const addProductIntoDB = async (payload: IProduct) => {
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
