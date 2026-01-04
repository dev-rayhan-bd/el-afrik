// models/product.model.ts

import mongoose, { Schema, Model, model } from 'mongoose';
import { IProductDocument, ProductStatus } from './product.interface';


const ProductSchema: Schema<IProductDocument> = new Schema(
  {
    name: {
      type: String,
      required: [true, 'Product name is required'],
      trim: true,
      maxlength: [100, 'Name cannot exceed 100 characters']
    },
    images: {
      type: [String],
      required: [true, 'At least one image is required'],
      validate: {
        validator: (v: string[]) => v.length > 0,
        message: 'Product must have at least one image'
      }
    },
    weight: {
      type: Number,
      required: [true, 'Weight is required'],
      min: [0, 'Weight cannot be negative']
    },
    category: {
      type: Schema.Types.ObjectId,
      ref: 'Category',
      required: [true, 'Category is required']
    },
    price: {
      type: Number,
      required: [true, 'Price is required'],
      min: [0, 'Price cannot be negative']
    },
    quantity: {
      type: Number,
      required: [true, 'Quantity is required'],
      min: [0, 'Quantity cannot be negative'],
      default: 0
    },
    status: {
      type: String,
      enum: Object.values(ProductStatus),
      default: ProductStatus.INSTOCK
    },
    deliveryFee: {
      type: Number,
      required: [true, 'Delivery fee is required'],
      min: [0, 'Delivery fee cannot be negative'],
      default: 0
    },
    points: {
      type: Number,
      default: 0,
      min: [0, 'Points cannot be negative']
    },
    description: {
      type: String,
      required: [true, 'Description is required'],
      trim: true,
      maxlength: [2000, 'Description cannot exceed 2000 characters']
    },
    promo: {
      type: String,
      required: [true, 'Promo code is required'],
    },
    isFavourite: {
      type: Boolean,
      default: false
    }
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Indexes for better query performance
ProductSchema.index({ name: 'text', description: 'text' });
ProductSchema.index({ category: 1 });
ProductSchema.index({ status: 1 });
ProductSchema.index({ price: 1 });




export const ProductModel = model<IProductDocument>("Product", ProductSchema);

