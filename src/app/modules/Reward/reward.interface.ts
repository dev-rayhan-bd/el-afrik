import { Types, Document } from 'mongoose';

// Point transaction types
export enum PointTransactionType {
  EARNED = 'earned',
  USED = 'used',
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
  remainingPoints: number; // Points that haven't been used/expired
  source: PointSource;
  orderId?: Types.ObjectId;
  orderNumber?: string;
  earnedAt: Date;
  expiresAt: Date;
  isFullyUsed: boolean;
  isExpired: boolean;
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
}

// Main Reward interface
export interface IReward {
  user: Types.ObjectId;
  totalEarned: number;      // Total points ever earned
  totalUsed: number;        // Total points ever used
  totalExpired: number;     // Total points expired
  currentBalance: number;   // Available points = earned - used - expired
  pointEntries: IPointEntry[]; // Individual point entries with validity
  history: IPointHistory[];    // Full transaction history
}

export interface IRewardDocument extends IReward, Document {
  _id: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

// Input types
export interface IAddPointsInput {
  userId: string;
  points: number;
  source: PointSource;
  orderId?: string;
  orderNumber?: string;
  validityDays?: number; // Default 365 days
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
  currentBalance: number;
  totalEarned: number;
  totalUsed: number;
  totalExpired: number;
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