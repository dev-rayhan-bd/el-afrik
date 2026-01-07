/* eslint-disable @typescript-eslint/no-explicit-any */

import AppError from "../../errors/AppError";
import { TEditProfile } from "./user.constant";
import httpStatus from 'http-status';
import { UserModel } from "./user.model";


const updateProfileFromDB = async (id: string, payload: TEditProfile) => {
  const result = await UserModel.findByIdAndUpdate(id, payload, {
    new: true,
  });

  return result;
};
const getMyProfileFromDB = async (id: string, ) => {
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
    throw new AppError(httpStatus.NOT_FOUND, 'FAQ not found!');
  }

  return event; // return deleted user if neededd
};



export const UserServices = {
  updateProfileFromDB,
  getDashboardStatsFromDB,
  getMyProfileFromDB,
  deletePrifileFromDB

};
