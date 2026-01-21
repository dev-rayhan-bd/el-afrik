// import AppError from '../../errors/AppError';

import AppError from '../../errors/AppError';



import httpStatus from 'http-status';


import QueryBuilder from '../../builder/QueryBuilder';
import { ICategories } from './categories.interface';
import CategoryModel from './categories.model';
import { ProductModel } from '../product/product.model';


const getAllActivitiesFromDB = async (query: Record<string, unknown>) => {
  const queryBuilder = new QueryBuilder(CategoryModel.find(), query);
  queryBuilder.search(['title', 'description']).filter().sort().paginate();
  const result = await queryBuilder.modelQuery
  const meta = await queryBuilder.countTotal();

  return { meta, result };
};
const getSingleActivitiesFromDB = async (id: string) => {
  const result = await CategoryModel.findById(id);
  return result;
};


const addActivitiesIntoDB = async (payload: ICategories) => {



  const result = (await CategoryModel.create(payload));
  return result;
};
const deleteActivitiesFromDB = async (id: string) => {

  const isCategoryInUse = await ProductModel.findOne({ category: id });

  if (isCategoryInUse) {
    throw new AppError(
      httpStatus.BAD_REQUEST, 
      'This category cannot be deleted because it is associated with existing products. Please delete or reassing the products first.'
    );
  }

  const category = await CategoryModel.findByIdAndDelete(id);

  if (!category) {
    throw new AppError(httpStatus.NOT_FOUND, 'Category not found!');
  }

  return category;
};

const updateActivitiesFromDB = async (id:string,payload:ICategories)=>{


 const updated = await CategoryModel
    .findByIdAndUpdate(
      id,
      { $set: payload },  
      { new: true, runValidators: true, context: "query" }
    )


  if (!updated) {
    throw new AppError(httpStatus.NOT_FOUND, "Category is not found!");
  }
    
 return updated
  
}

export const CategoryServices = {
 getAllActivitiesFromDB,getSingleActivitiesFromDB,deleteActivitiesFromDB,updateActivitiesFromDB,addActivitiesIntoDB};
