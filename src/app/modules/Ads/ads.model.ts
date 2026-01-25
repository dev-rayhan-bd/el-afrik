import { Schema, model } from 'mongoose';
import { IAds } from './ads.interface';

const AdsSchema = new Schema<IAds>(
  {
image: { 
      type:String, 
  
     
    },
  },
  { timestamps: true }
);

export const AdsModel = model<IAds>('Ads', AdsSchema);