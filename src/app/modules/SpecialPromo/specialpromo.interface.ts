import { Types } from 'mongoose';


export interface ISpecialPromo {
  product: Types.ObjectId;
  specialPromoCode: string; // (e.g., "ALAFRIK20")
  discountType: 'percentage' | 'fixed';
  discountAmount: number;
  validity: Date;
  type:string;
}