// c:\STA\El-afrik\src\app\modules\Reward\reward.interface.ts

import { Types, Document } from 'mongoose';

// Point transaction types
export enum PointTransactionType {
  PENDING = 'pending',
  CLAIMED = 'claimed',
  EARNED = 'earned',
  USED = 'used',
  EXPIRED = 'expired',
  REFUNDED = 'refunded',
}

// Point status for entries
export enum PointStatus {
  PENDING = 'pending',
  CLAIMED = 'claimed',
  PARTIALLY_USED = 'partially_used',
  FULLY_USED = 'fully_used',
  EXPIRED = 'expired',
}

// Point source
export enum PointSource {
  ORDER = 'order',
  REFERRAL = 'referral',
  BONUS = 'bonus',
  REFUND = 'refund',
}

// Individual point entry with validity
export interface IPointEntry {
  _id?: Types.ObjectId;
  points: number;
  remainingPoints: number;
  status: PointStatus;
  source: PointSource;
  orderId?: Types.ObjectId;
  orderNumber?: string;
  earnedAt: Date;
  claimedAt?: Date;
  expiresAt: Date;
  description?: string;
}

// Point history entry for tracking all transactions
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
  relatedEntryId?: Types.ObjectId;
}

// Main Reward interface
export interface IReward {
  user: Types.ObjectId;
  pendingPoints: number;
  claimedPoints: number;
  totalEarned: number;
  totalUsed: number;
  totalExpired: number;
  currentBalance: number;
  pointEntries: IPointEntry[];
  history: IPointHistory[];
}

export interface IRewardDocument extends IReward, Document {
  _id: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

// Input types
export interface IAddPendingPointsInput {
  userId: string;
  points: number;
  source: PointSource;
  orderId?: string;
  orderNumber?: string;
  validityDays?: number;
  description?: string;
}

export interface IClaimPointsInput {
  userId: string;
  entryId?: string;
}

export interface IRedeemPointsInput {
  userId: string;
  points: number;
  orderId?: string;
  orderNumber?: string;
  description?: string;
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

export interface IUsePointsInput {
  userId: string;
  points: number;
  orderId?: string;
  orderNumber?: string;
  description?: string;
}

// Response types
export interface IRewardSummary {
  pendingPoints: number;
  claimedPoints: number;
  currentBalance: number;
  totalEarned: number;
  totalUsed: number;
  totalExpired: number;
  claimableEntries: {
    entryId: string;
    points: number;
    source: PointSource;
    orderNumber?: string;
    earnedAt: Date;
    expiresAt: Date;
    daysToExpire: number;
  }[];
  expiringPoints: {
    amount: number;
    expiresAt: Date;
    daysLeft: number;
  }[];
}

export interface IHistoryFilters {
  type?: PointTransactionType;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}

export interface IPointRedemptionResult {
  pointsUsed: number;
  remainingBalance: number;
}