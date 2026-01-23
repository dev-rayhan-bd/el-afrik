import { Schema, model } from 'mongoose';
import { IQRCode } from './qrcode.interface';

const QRCodeSchema = new Schema<IQRCode>({
  title: { type: String, required: true },
  code: { type: String, required: true, unique: true },
  points: { type: Number, required: true },
  isUsed: { type: Boolean, default: false },
  usedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  expiryDate: { type: Date, required: true },
}, { timestamps: true });

export const QRCodeModel = model<IQRCode>('QRCode', QRCodeSchema);