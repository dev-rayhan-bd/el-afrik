import { Schema, model } from 'mongoose';
import { IAds } from './ads.interface';

const AdsSchema = new Schema<IAds>(
  {
images: { 
      type: [String], 
      required: [true, 'At least one image is required'],
      validate: {
        validator: (v: string[]) => v.length > 0,
        message: 'Images array cannot be empty'
      }
    },
  },
  { timestamps: true }
);

export const AdsModel = model<IAds>('Ads', AdsSchema);