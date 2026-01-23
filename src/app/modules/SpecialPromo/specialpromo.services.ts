import httpStatus from 'http-status';
import AppError from '../../errors/AppError';
import { ProductModel } from '../product/product.model';
import { ISpecialPromo } from './specialpromo.interface';
import QueryBuilder from '../../builder/QueryBuilder';
import { SpecialPromoModel } from './specialpromo.model';





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

const validatePromoCode = async (productId: string, code: string) => {
  const promo = await SpecialPromoModel.findOne({
    product: productId,
    promoCode: code.toUpperCase(),
    validity: { $gte: new Date() }
  });

  if (!promo) {
    throw new AppError(httpStatus.BAD_REQUEST, "Invalid or expired promo code for this product!");
  }

  return promo;
};


export const SpecialPromoServices = {
  createSpecialPromo,
  getAllSpecialPromos,
  deleteSpecialPromo,
  validatePromoCode
};