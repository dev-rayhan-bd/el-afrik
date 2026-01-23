/* eslint-disable @typescript-eslint/no-explicit-any */

import AppError from "../../errors/AppError";
import { TEditProfile } from "./user.constant";
import httpStatus from 'http-status';
import { UserModel } from "./user.model";
import QueryBuilder from "../../builder/QueryBuilder";
import { ProductModel } from "../product/product.model";
import { OrderModel } from "../Orders/orders.model";
import { PaymentStatus } from "../Orders/orders.interface";


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



const getDashboardStatsFromDB = async (year: number) => {
  const startOfYear = new Date(year, 0, 1);
  const endOfYear = new Date(year, 11, 31, 23, 59, 59);


  const [
    totalUsers,
    totalProducts,
    totalOrders,
    overallEarningsResult
  ] = await Promise.all([
    UserModel.countDocuments({ role: 'user' }),
    ProductModel.countDocuments(),
    OrderModel.countDocuments(),
    OrderModel.aggregate([
      { $match: { paymentStatus: PaymentStatus.PAID } },
      { $group: { _id: null, total: { $sum: "$totalAmount" } } }
    ])
  ]);

  const lifetimeEarnings = overallEarningsResult.length > 0 ? overallEarningsResult[0].total : 0;

  
  const userStats = await UserModel.aggregate([
    {
      $match: {
        createdAt: { $gte: startOfYear, $lte: endOfYear },
        role: 'user'
      },
    },
    {
      $group: {
        _id: { $month: "$createdAt" },
        count: { $sum: 1 },
      },
    },
  ]);

  const orderStats = await OrderModel.aggregate([
    {
      $match: {
        createdAt: { $gte: startOfYear, $lte: endOfYear },
        paymentStatus: PaymentStatus.PAID,
      },
    },
    {
      $group: {
        _id: { $month: "$createdAt" },
        sales: { $sum: 1 },
        earnings: { $sum: "$totalAmount" },
      },
    },
  ]);

  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

  const userGraphData = months.map((month, index) => {
    const monthNum = index + 1;
    const match = userStats.find((u) => u._id === monthNum);
    return {
      month,
      totalUsers: match ? match.count : 0,
    };
  });


  const earningGraphData = months.map((month, index) => {
    const monthNum = index + 1;
    const match = orderStats.find((o) => o._id === monthNum);
    return {
      month,
      totalEarnings: match ? parseFloat(match.earnings.toFixed(2)) : 0,
      totalSales: match ? match.sales : 0,
    };
  });

  return {
    lifetimeSummary: {
      totalUsers,
      totalProducts,
      totalOrders,
      totalEarnings: parseFloat(lifetimeEarnings.toFixed(2)),
    },
    yearlySummary: {
      year,
      totalUsersInYear: userGraphData.reduce((acc, curr) => acc + curr.totalUsers, 0),
      totalSalesInYear: earningGraphData.reduce((acc, curr) => acc + curr.totalSales, 0),
      totalEarningsInYear: parseFloat(earningGraphData.reduce((acc, curr) => acc + curr.totalEarnings, 0).toFixed(2)),
    },
    userGraphData,     
    earningGraphData,  
  };
};


export const UserServices = {
  updateProfileFromDB,
  getDashboardStatsFromDB,
  getMyProfileFromDB,
  deletePrifileFromDB,
  getAllUserFromDB,getSingleProfileFromDB,deleteUserFromDB,blockUserFromDB

};
