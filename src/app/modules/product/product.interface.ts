// interfaces/product.interface.ts

import { Document, Types } from 'mongoose';

export interface IProduct {
  name: string;
  images: string[];
  weight: number;
  category: Types.ObjectId;
  price: number;
  quantity: number;
  status: ProductStatus;
  deliveryFee: number;
  points: number;
  description: string;
  promo: string;
  isFavourite: boolean;
}

export interface IProductDocument extends IProduct, Document {
  createdAt: Date;
  updatedAt: Date;
}

export enum ProductStatus {
  INSTOCK = 'in_stock',
  OUT_OF_STOCK = 'out_of_stock',
}