import { AdsModel } from './ads.model';
import AppError from '../../errors/AppError';
import httpStatus from 'http-status';
import { IAds } from './ads.interface';
import QueryBuilder from '../../builder/QueryBuilder';

const createAdsIntoDB = async (payload: Partial<IAds>) => {
  return await AdsModel.create(payload);
};

const getAllAdsFromDB = async (query: Record<string, unknown>) => {

    const queryBuilder = new QueryBuilder(AdsModel.find(), query);
    queryBuilder.filter().sort().paginate();
    const result = await queryBuilder.modelQuery
    const meta = await queryBuilder.countTotal();
  return { meta, result };
};

const deleteAdsFromDB = async (id: string) => {
  const result = await AdsModel.findByIdAndDelete(id);
  if (!result) {
    throw new AppError(httpStatus.NOT_FOUND, 'Ads not found');
  }
  return result;
};

export const AdsServices = {
  createAdsIntoDB,
  getAllAdsFromDB,
  deleteAdsFromDB,
};