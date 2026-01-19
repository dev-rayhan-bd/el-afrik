// modules/order/order.interface.ts
import { Document, Types } from 'mongoose';

// Order Status - 3 states only
export enum OrderStatus {
  ONGOING = 'ongoing',
  DELIVERED = 'delivered',
  CANCELLED = 'cancelled',
}

// Order Type - Pickup or Delivery
export enum OrderType {
  PICKUP = 'pickup',
  DELIVERY = 'delivery',
}

// Payment Status
export enum PaymentStatus {
  PENDING = 'pending',
  PAID = 'paid',
  FAILED = 'failed',
}

// Order Item Interface
export interface IOrderItem {
  product: Types.ObjectId;
  name: string;
  image?: string;
  price: number;
  quantity: number;
  total: number;
  points: number; // Points for this item (product.points * quantity)
}

// Shipping Address Interface
export interface IShippingAddress {
  name?: string;
  phone?: string;
  line1?: string;
  line2?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
}

// Status History Entry
export interface IStatusHistory {
  status: OrderStatus;
  timestamp: Date;
  note?: string;
}

// Main Order Interface
export interface IOrder {
  user: Types.ObjectId;
  orderNumber: string;
  items: IOrderItem[];

  // Pricing
  subtotal: number;
  deliveryFee: number; // 0 for pickup, calculated for delivery
  discount: number;
  totalAmount: number;

  // Points
  totalPoints: number; // Total points earned from this order

  // Order Info
  orderType: OrderType;
  orderStatus: OrderStatus;
  statusHistory: IStatusHistory[];

  // Payment
  paymentStatus: PaymentStatus;
  stripeSessionId?: string;
  stripePaymentIntentId?: string;

  // Customer Info
  customerName?: string;
  customerEmail: string;
  customerPhone?: string;

  // For Delivery only
  shippingAddress?: IShippingAddress;

  // For Pickup only
  pickupTime?: string;

  // Timestamps
  paidAt?: Date;
  deliveredAt?: Date;
  cancelledAt?: Date;

  // Points added to user
  pointsAdded: boolean;

  estimatedTime?: string;
  notes?: string;
}

// Document Interface
export interface IOrderDocument extends IOrder, Document {
  _id: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

// Create Order Input
export interface ICreateOrderInput {
  userId: string;
  orderType: OrderType;
  customerEmail: string;
  customerName?: string;
  customerPhone?: string;
  shippingAddress?: IShippingAddress;
  pickupTime?: string;
  notes?: string;
}

// Query Filters
export interface IOrderFilters {
  user?: string;
  orderStatus?: OrderStatus;
  orderType?: OrderType;
  paymentStatus?: PaymentStatus;
  search?: string;
  startDate?: string;
  endDate?: string;
}

// Pagination
export interface IPaginationOptions {
  page: number;
  limit: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}