import { AdsModel } from './ads.model';
import AppError from '../../errors/AppError';
import httpStatus from 'http-status';

const createAdsIntoDB = async (payload: { images: string[] }) => {
  return await AdsModel.create(payload);
};

const getAllAdsFromDB = async () => {
  return await AdsModel.find().sort({ createdAt: -1 });
};

const deleteAdsFromDB = async (id: string) => {
  const result = await AdsModel.findByIdAndDelete(id);
  if (!result) {
    throw new AppError(httpStatus.NOT_FOUND, 'Ad not found');
  }
  return result;
};

export const AdsServices = {
  createAdsIntoDB,
  getAllAdsFromDB,
  deleteAdsFromDB,
};