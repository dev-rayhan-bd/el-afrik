import httpStatus from 'http-status';
import AppError from '../../errors/AppError';
import { ProductModel } from '../product/product.model';
import { ISpecialPromo } from './specialpromo.interface';
import QueryBuilder from '../../builder/QueryBuilder';
import { SpecialPromoModel } from './specialpromo.model';
import { generateRandomPromoCode } from '../../utils/generateRandomPromoCode';




const createSpecialPromo = async (payload: Partial<ISpecialPromo>) => {

  const isProductExist = await ProductModel.findById(payload.product);
  if (!isProductExist) {
    throw new AppError(httpStatus.NOT_FOUND, 'Product not found');
  }



  const isAlreadyInPromo = await SpecialPromoModel.findOne({ 
    product: payload.product 
  });

  if (isAlreadyInPromo) {
    throw new AppError(
      httpStatus.CONFLICT, 
      'This product is already added to special promos. You can update the existing one instead.'
    );
  }


  payload.specialPromoCode = generateRandomPromoCode();


  const result = await SpecialPromoModel.create(payload);
  return result;
};

const getAllSpecialPromos = async (query: Record<string, unknown>) => {
  const promoQuery = new QueryBuilder(
    SpecialPromoModel.find().populate('product'),
    query
  )
    .filter()
    .sort()
    .paginate();

  const result = await promoQuery.modelQuery;
  const meta = await promoQuery.countTotal();

  return { meta, result };
};

const deleteSpecialPromo = async (id: string) => {
  const result = await SpecialPromoModel.findByIdAndDelete(id);
  if (!result) {
    throw new AppError(httpStatus.NOT_FOUND, 'Promo not found');
  }
  return result;
};

export const SpecialPromoServices = {
  createSpecialPromo,
  getAllSpecialPromos,
  deleteSpecialPromo,
};