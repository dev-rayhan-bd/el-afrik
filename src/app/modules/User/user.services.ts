/* eslint-disable @typescript-eslint/no-explicit-any */

import { TEditProfile } from "./user.constant";

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
//sreentime and movement data 

const updateScreenTimeData = async (userId: string, data: any) => {
  const result = await UserModel.findByIdAndUpdate(
    userId,
    { 
      $set: { screenTimeData: data }
    },
    { new: true }
  );
  
  return result?.screenTimeData;
};

const updateMovementData = async (userId: string, data: any) => {
  const result = await UserModel.findByIdAndUpdate(
    userId,
    { 
      $set: { movementData: data }
    },
    { new: true }
  );
  
  return result?.movementData;
};

// Get functions
const getScreenTimeData = async (userId: string) => {
  const user = await UserModel.findById(userId);
  return user?.screenTimeData || {};
};

const getMovementData = async (userId: string) => {
  const user = await UserModel.findById(userId);
  return user?.movementData || {};
};




export const UserServices = {
  updateProfileFromDB,
  getDashboardStatsFromDB,
  getMyProfileFromDB,
  updateScreenTimeData,
  updateMovementData,
  getScreenTimeData,
  getMovementData,
};
