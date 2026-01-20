import { Types } from 'mongoose';

export interface IWishlist {
  user: Types.ObjectId;
  products: Types.ObjectId[];
}