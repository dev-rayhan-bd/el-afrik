import { Types } from 'mongoose';
import { IProductDocument } from '../product/product.interface';


export interface ICartItem {
  product: Types.ObjectId | IProductDocument;
  quantity: number;
  total: number;
}

export interface ICartDocument {
  user: Types.ObjectId;
  items: ICartItem[];
  subtotal: number;
  createdAt: Date;
  updatedAt: Date;
}
