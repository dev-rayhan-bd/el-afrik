// c:\STA\El-afrik\src\app\modules\Orders\orders.model.ts

import mongoose, { Schema, model } from 'mongoose';
import {
  IOrderDocument,
  IOrderItem,
  IStatusHistory,
  OrderStatus,
  OrderType,
  PaymentStatus,
  PaymentMethod,
} from './orders.interface';

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
    pointsCost: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  { _id: false }
);

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
    totalPoints: {
      type: Number,
      default: 0,
      min: 0,
    },
    pointsAdded: {
      type: Boolean,
      default: false,
    },
    pointsUsed: {
      type: Number,
      default: 0,
      min: 0,
    },
    pointsValue: {
      type: Number,
      default: 0,
      min: 0,
    },
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
    paymentStatus: {
      type: String,
      enum: Object.values(PaymentStatus),
      default: PaymentStatus.PENDING,
    },
    paymentMethod: {
      type: String,
      enum: Object.values(PaymentMethod),
      default: PaymentMethod.CARD,
    },
    stripeSessionId: String,
    stripePaymentIntentId: String,
    customerName: String,
    customerEmail: String,
    customerPhone: String,
    shippingAddress: ShippingAddressSchema,
    pickupTime: String,
    redemptionDeliveryType: {
      type: String,
      enum: ['pickup', 'delivery'],
    },
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

OrderSchema.pre('save', async function () {
  if (!this.orderNumber) {
    const date = new Date();
    const year = date.getFullYear().toString().slice(-2);
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const random = Math.random().toString(36).substring(2, 7).toUpperCase();

    const prefix = this.orderType === OrderType.POINT_REDEMPTION ? 'PTS' : 'ORD';
    this.orderNumber = `${prefix}-${year}${month}${day}-${random}`;
  }
});

OrderSchema.index({ user: 1, createdAt: -1 });
OrderSchema.index({ orderNumber: 1 });
OrderSchema.index({ stripeSessionId: 1 });
OrderSchema.index({ orderStatus: 1 });
OrderSchema.index({ orderType: 1 });
OrderSchema.index({ paymentStatus: 1 });
OrderSchema.index({ paymentMethod: 1 });
OrderSchema.index({ createdAt: -1 });

export const OrderModel = model<IOrderDocument>('Order', OrderSchema);