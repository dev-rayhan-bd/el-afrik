// c:\STA\El-afrik\src\app\modules\Reward\reward.model.ts

import { Schema, model } from 'mongoose';
import {
  IRewardDocument,
  PointTransactionType,
  PointSource,
  PointStatus,
} from './reward.interface';

const PointEntrySchema = new Schema(
  {
    points: {
      type: Number,
      required: true,
      min: 0,
    },
    remainingPoints: {
      type: Number,
      required: true,
      min: 0,
    },
    status: {
      type: String,
      enum: Object.values(PointStatus),
      default: PointStatus.PENDING,
      required: true,
    },
    source: {
      type: String,
      enum: Object.values(PointSource),
      required: true,
    },
    orderId: {
      type: Schema.Types.ObjectId,
      ref: 'Order',
    },
    orderNumber: String,
    description: String,
    earnedAt: {
      type: Date,
      default: Date.now,
    },
    claimedAt: {
      type: Date,
    },
    expiresAt: {
      type: Date,
      required: true,
    },
  },
  { _id: true, timestamps: false }
);

const PointHistorySchema = new Schema(
  {
    type: {
      type: String,
      enum: Object.values(PointTransactionType),
      required: true,
    },
    points: {
      type: Number,
      required: true,
    },
    source: {
      type: String,
      enum: Object.values(PointSource),
    },
    orderId: {
      type: Schema.Types.ObjectId,
      ref: 'Order',
    },
    orderNumber: String,
    description: {
      type: String,
      required: true,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
    balanceAfter: {
      type: Number,
      required: true,
    },
    relatedEntryId: {
      type: Schema.Types.ObjectId,
    },
  },
  { _id: true }
);

const RewardSchema = new Schema<IRewardDocument>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
    },
    pendingPoints: {
      type: Number,
      default: 0,
      min: 0,
    },
    claimedPoints: {
      type: Number,
      default: 0,
      min: 0,
    },
    totalEarned: {
      type: Number,
      default: 0,
      min: 0,
    },
    totalUsed: {
      type: Number,
      default: 0,
      min: 0,
    },
    totalExpired: {
      type: Number,
      default: 0,
      min: 0,
    },
    currentBalance: {
      type: Number,
      default: 0,
      min: 0,
    },
    pointEntries: [PointEntrySchema],
    history: [PointHistorySchema],
  },
  {
    timestamps: true,
  }
);

// Indexes
RewardSchema.index({ user: 1 });
RewardSchema.index({ 'pointEntries.status': 1 });
RewardSchema.index({ 'pointEntries.expiresAt': 1 });
RewardSchema.index({ 'history.type': 1 });
RewardSchema.index({ 'history.createdAt': -1 });

export const RewardModel = model<IRewardDocument>('Reward', RewardSchema);