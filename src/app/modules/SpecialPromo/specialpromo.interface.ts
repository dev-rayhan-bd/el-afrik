import { Types } from 'mongoose';

export interface ISpecialPromo {
  product: Types.ObjectId;
  specialPromoCode: string; 
  validity: Date;
  type:string
}