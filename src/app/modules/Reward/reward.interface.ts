import { Types, Document } from 'mongoose';

export enum PointTransactionType {
  EARNED = 'earned',
  USED = 'used',
  EXPIRED = 'expired',
  REFUNDED = 'refunded',
}

export enum PointStatus {
  ACTIVE = 'active',
  PARTIALLY_USED = 'partially_used',
  FULLY_USED = 'fully_used',
  EXPIRED = 'expired',
}

export enum PointSource {
  ORDER = 'order',
  REFERRAL = 'referral',
  BONUS = 'bonus',
  REFUND = 'refund',
}

export interface IPointEntry {
  _id?: Types.ObjectId;
  points: number;
  remainingPoints: number;
  status: PointStatus;
  source: PointSource;
  orderId?: Types.ObjectId;
  orderNumber?: string;
  earnedAt: Date;
  expiresAt: Date;
  description?: string;
}

export interface IPointHistory {
  _id?: Types.ObjectId;
  type: PointTransactionType;
  points: number;
  source?: PointSource;
  orderId?: Types.ObjectId;
  orderNumber?: string;
  description: string;
  createdAt: Date;
  balanceAfter: number;
}

export interface IReward {
  user: Types.ObjectId;
  currentBalance: number;
  totalEarned: number;
  totalUsed: number;
  totalExpired: number;
  pointEntries: IPointEntry[];
  history: IPointHistory[];
}

export interface IRewardDocument extends IReward, Document {
  _id: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

export interface IAddPointsInput {
  userId: string;
  points: number;
  source: PointSource;
  orderId?: string;
  orderNumber?: string;
  validityDays?: number;
  description?: string;
}

export interface IRedeemPointsInput {
  userId: string;
  points: number;
  orderId?: string;
  orderNumber?: string;
  description?: string;
}