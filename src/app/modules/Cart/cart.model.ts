import mongoose, { Schema, model } from 'mongoose';
import { ICartItem, ICartDocument } from './cart.interface';


const CartItemSchema: Schema<ICartItem> = new Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
    },
    quantity: {
      type: Number,
      required: true,
      min: [1, 'Quantity must be at least 1'],
    },
    total: {
      type: Number,
      required: true,
      min: [0, 'Total cannot be negative'],
    },
  },
  { _id: false } // Avoid generating an _id for the cart items
);

const CartSchema: Schema<ICartDocument> = new Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User', // Reference to the User model
      required: true,
    },
    items: {
      type: [CartItemSchema],
      default: [],
    },
    subtotal: {
      type: Number,
      required: true,
      min: [0, 'Subtotal cannot be negative'],
    },
  },
  {
    timestamps: true,
  }
);

export const CartModel = model<ICartDocument>('Cart', CartSchema);
