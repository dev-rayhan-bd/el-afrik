// modules/order/order.model.ts
import mongoose, { Schema, model } from 'mongoose';
import {
  IOrderDocument,
  IOrderItem,
  IStatusHistory,
  OrderStatus,
  OrderType,
  PaymentStatus,
} from './orders.interface';

// Order Item Schema
const OrderItemSchema = new Schema<IOrderItem>(
  {
    product: {
      type: Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
    },
    name: {
      type: String,
      required: true,
    },
    image: {
      type: String,
    },
    price: {
      type: Number,
      required: true,
      min: 0,
    },
    quantity: {
      type: Number,
      required: true,
      min: 1,
    },
    total: {
      type: Number,
      required: true,
      min: 0,
    },
    points: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  { _id: false }
);

// Status History Schema
const StatusHistorySchema = new Schema<IStatusHistory>(
  {
    status: {
      type: String,
      enum: Object.values(OrderStatus),
      required: true,
    },
    timestamp: {
      type: Date,
      default: Date.now,
    },
    note: {
      type: String,
    },
  },
  { _id: false }
);

// Shipping Address Schema
const ShippingAddressSchema = new Schema(
  {
    name: String,
    phone: String,
    line1: String,
    line2: String,
    city: String,
    state: String,
    postalCode: String,
    country: String,
  },
  { _id: false }
);

// Main Order Schema
const OrderSchema = new Schema<IOrderDocument>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User is required'],
    },
    orderNumber: {
      type: String,
   
      unique: true,
    },
    items: {
      type: [OrderItemSchema],
      required: true,
      validate: {
        validator: (v: IOrderItem[]) => v.length > 0,
        message: 'Order must have at least one item',
      },
    },

    // Pricing
    subtotal: {
      type: Number,
      required: true,
      min: 0,
    },
    deliveryFee: {
      type: Number,
      default: 0,
      min: 0,
    },
    discount: {
      type: Number,
      default: 0,
      min: 0,
    },
    totalAmount: {
      type: Number,
      required: true,
      min: 0,
    },

    // Points
    totalPoints: {
      type: Number,
      default: 0,
      min: 0,
    },
    pointsAdded: {
      type: Boolean,
      default: false,
    },

    // Order Type & Status
    orderType: {
      type: String,
      enum: Object.values(OrderType),
      required: [true, 'Order type is required'],
    },
    orderStatus: {
      type: String,
      enum: Object.values(OrderStatus),
      default: OrderStatus.ONGOING,
    },
    statusHistory: {
      type: [StatusHistorySchema],
      default: [],
    },

    // Payment
    paymentStatus: {
      type: String,
      enum: Object.values(PaymentStatus),
      default: PaymentStatus.PENDING,
    },
    stripeSessionId: String,
    stripePaymentIntentId: String,

    // Customer Info
    customerName: String,
    customerEmail: {
      type: String,
 
    },
    customerPhone: String,

    // Shipping (only for delivery)
    shippingAddress: ShippingAddressSchema,

    // Pickup
    pickupTime: String,

    // Timestamps
    paidAt: Date,
    deliveredAt: Date,
    cancelledAt: Date,

    estimatedTime: String,
    notes: String,
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// ═══════════════════════════════════════════════════════════════════
// FIXED: Generate unique order number (No next() needed with async)
// ═══════════════════════════════════════════════════════════════════
OrderSchema.pre('save', async function () {
  if (!this.orderNumber) {
    const date = new Date();
    const year = date.getFullYear().toString().slice(-2);
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const random = Math.random().toString(36).substring(2, 7).toUpperCase();
    this.orderNumber = `ORD-${year}${month}${day}-${random}`;
  }
});

// Indexes
OrderSchema.index({ user: 1, createdAt: -1 });
OrderSchema.index({ orderNumber: 1 });
OrderSchema.index({ stripeSessionId: 1 });
OrderSchema.index({ orderStatus: 1 });
OrderSchema.index({ orderType: 1 });
OrderSchema.index({ paymentStatus: 1 });
OrderSchema.index({ createdAt: -1 });

export const OrderModel = model<IOrderDocument>('Order', OrderSchema);