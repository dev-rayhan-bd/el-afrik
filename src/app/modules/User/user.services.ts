/* eslint-disable @typescript-eslint/no-explicit-any */

import AppError from "../../errors/AppError";
import { TEditProfile } from "./user.constant";
import httpStatus from 'http-status';
import { UserModel } from "./user.model";
import QueryBuilder from "../../builder/QueryBuilder";


const updateProfileFromDB = async (id: string, payload: TEditProfile) => {
  const firstName=payload.firstName
const lastName=payload.lastName
const fullName=`${firstName} ${lastName}`
payload.fullName=fullName
  const result = await UserModel.findByIdAndUpdate(id, payload, {
    new: true,
  });

  return result;
};
const getMyProfileFromDB = async (id: string, ) => {
  const result = await UserModel.findById(id);

  return result;
};
const getSingleProfileFromDB = async (id: string, ) => {
  const result = await UserModel.findById(id);

  return result;
};

const getDashboardStatsFromDB = async (year: number) => {



  // Initialize month counts
  const monthlyCounts = Array(12).fill(0);

  // Count bookings by month
 

  // Format for frontend graph (Jan–Dec)
  const monthlyData = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
  ].map((label, index) => ({
    month: label,
    total: monthlyCounts[index],
  }));

  return { monthlyData };
};
const deletePrifileFromDB = async (id: string) => {
  const event = await UserModel.findByIdAndDelete(id);

  if (!event) {
    throw new AppError(httpStatus.NOT_FOUND, 'User not found!');
  }

  return event; // return deleted user if neededd
};
const deleteUserFromDB = async (id: string) => {
  const event = await UserModel.findByIdAndDelete(id);

  if (!event) {
    throw new AppError(httpStatus.NOT_FOUND, 'User not found!');
  }

  return event; // return deleted user if neededd
};
const getAllUserFromDB = async (query: Record<string, unknown>) => {
  const queryBuilder = new QueryBuilder(UserModel.find(), query);
  queryBuilder.search(["firstName", "lastName", "email", "role"]).filter().sort().paginate();
  const result = await queryBuilder.modelQuery;
  const meta = await queryBuilder.countTotal();

  return { meta, result };
};
const blockUserFromDB = async (id: string, status: string) => {

  const user = await UserModel.findById(id);
  if (!user) {
    throw new AppError(httpStatus.NOT_FOUND, 'User not found!');
  }


  const result = await UserModel.findByIdAndUpdate(
    id,
    { status },
    { new: true, runValidators: true }
  );

  return result;
};



export const UserServices = {
  updateProfileFromDB,
  getDashboardStatsFromDB,
  getMyProfileFromDB,
  deletePrifileFromDB,
  getAllUserFromDB,getSingleProfileFromDB,deleteUserFromDB,blockUserFromDB

};
