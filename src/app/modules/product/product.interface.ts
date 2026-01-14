// interfaces/product.interface.ts

import mongoose, { Document, Types } from 'mongoose';
export type TReview ={

  package_id: mongoose.Types.ObjectId; 
  rating: number;           
  
}

export type TDiscount={
  discount_type:string;
  discount_amount:number;
}

export interface IProduct {
  name: string;
  images: string[];
  weight: number;
  category: Types.ObjectId;
  price: number;
  discount?:TDiscount;
    discountedPrice?: number;
  quantity: number;
  status: ProductStatus;
  deliveryFee: number;
  review:TReview[];
  points: number;
  description: string;
  promo?: string;
  calories?: number;
  readyTime?: string;
  isFavourite: boolean;
  isFeatured?: boolean;
}

export interface IProductDocument extends IProduct, Document {
  createdAt: Date;
  updatedAt: Date;
}

export enum ProductStatus {
  INSTOCK = 'in_stock',
  OUT_OF_STOCK = 'out_of_stock',
}