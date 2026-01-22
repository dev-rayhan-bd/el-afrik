// models/product.model.ts

import mongoose, { Schema, Model, model } from 'mongoose';
import { IProductDocument, ProductStatus, TReview } from './product.interface';


const ReviewSchema: Schema = new Schema<TReview>(
  {
 
    package_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Package",
      required: [true, "Package reference is required"],
    },

    rating: {
      type: Number,
      required: [true, "Rating is required"],
      min: [1, "Rating must be at least 1"],
      max: [5, "Rating cannot be more than 5"],
    },
  
  },
  {
    timestamps: true, // Automatically create createdAt and updatedAt fields
  }
);


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
      ref: 'Categories',
      required: [true, 'Category is required']
    },
    price: {
      type: Number,
      required: [true, 'Price is required'],
      min: [0, 'Price cannot be negative']
    },

    // Discount field added to the schema
    discount: {

        discount_type: {
          type: String,
          enum: ['percentage', 'fixed'],
 
        },
        discount_amount: {
          type: Number,

          min: [0, 'Discount amount cannot be negative']
        }


    },
        discountedPrice:{   type: Number,
      min: [0, 'Discounted Price cannot be negative']},
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
    calories: {
      type: Number,
      min: [0, 'Calories cannot be negative'],
      required: [true, 'Calories is required']
    },
    readyTime: {
      type: String,
      required: [true, 'Ready time is required'],
      trim: true,
      maxlength: [50, 'Ready time cannot exceed 50 characters']
    },
    description: {
      type: String,
      required: [true, 'Description is required'],
      trim: true,
      maxlength: [2000, 'Description cannot exceed 2000 characters']
    },
        review: { type: [ReviewSchema], default: [] },
    promo: {
      type: String,
 
    },
    isFavourite: {
      type: Boolean,
      default: false
    },
    isFeatured: {
      type: Boolean,
      default: false
    },
    isRedem: {
      type: Boolean,
      default: false
    },
    isVip: {
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

