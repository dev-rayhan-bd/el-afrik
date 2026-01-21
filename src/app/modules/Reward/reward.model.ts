import { Schema, model } from 'mongoose';
import { IRewardDocument, PointTransactionType, PointSource, PointStatus } from './reward.interface';

const PointEntrySchema = new Schema({
  points: { type: Number, required: true },
  remainingPoints: { type: Number, required: true },
  status: { type: String, enum: Object.values(PointStatus), default: PointStatus.ACTIVE },
  source: { type: String, enum: Object.values(PointSource), required: true },
  orderId: { type: Schema.Types.ObjectId, ref: 'Order' },
  orderNumber: String,
  earnedAt: { type: Date, default: Date.now },
  expiresAt: { type: Date, required: true },
  description: String,
}, { _id: true });

const PointHistorySchema = new Schema({
  type: { type: String, enum: Object.values(PointTransactionType), required: true },
  points: { type: Number, required: true },
  source: { type: String, enum: Object.values(PointSource) },
  orderId: { type: Schema.Types.ObjectId, ref: 'Order' },
  orderNumber: String,
  description: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
  balanceAfter: { type: Number, required: true },
}, { _id: true });

const RewardSchema = new Schema<IRewardDocument>({
  user: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  currentBalance: { type: Number, default: 0 },
  totalEarned: { type: Number, default: 0 },
  totalUsed: { type: Number, default: 0 },
  totalExpired: { type: Number, default: 0 },
  pointEntries: [PointEntrySchema],
  history: [PointHistorySchema],
}, { timestamps: true });

export const RewardModel = model<IRewardDocument>('Reward', RewardSchema);