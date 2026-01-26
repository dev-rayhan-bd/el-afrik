// c:\STA\El-afrik\src\app\modules\Orders\orders.interface.ts

import { Document, Types } from 'mongoose';

export enum OrderStatus {
  ONGOING = 'ongoing',
  DELIVERED = 'delivered',
  CANCELLED = 'cancelled',
}

export enum OrderType {
  PICKUP = 'pickup',
  DELIVERY = 'delivery',
  POINT_REDEMPTION = 'point_redemption',
}

export enum PaymentStatus {
  PENDING = 'pending',
  PAID = 'paid',
  FAILED = 'failed',
  POINTS_PAID = 'points_paid',
}

export enum PaymentMethod {
  CARD = 'card',
  POINTS = 'points',
}

export interface IOrderItem {
  product: Types.ObjectId;
  name: string;
  image?: string;
  price: number;
  quantity: number;
  total: number;
  points: number;
  pointsCost?: number;
}

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

export interface IStatusHistory {
  status: OrderStatus;
  timestamp: Date;
  note?: string;
}

export interface IOrder {
  user: Types.ObjectId;
  orderNumber: string;
  items: IOrderItem[];
  subtotal: number;
  deliveryFee: number;
  discount: number;
  totalAmount: number;
  totalPoints: number;
  pointsUsed: number;
  pointsValue: number;
  orderType: OrderType;
  orderStatus: OrderStatus;
  statusHistory: IStatusHistory[];
  paymentStatus: PaymentStatus;
  paymentMethod: PaymentMethod;
  stripeSessionId?: string;
  stripePaymentIntentId?: string;
  customerName?: string;
  customerEmail: string;
  customerPhone?: string;
  shippingAddress?: IShippingAddress;
  pickupTime?: string;
  redemptionDeliveryType?: 'pickup' | 'delivery';
  paidAt?: Date;
  deliveredAt?: Date;
  cancelledAt?: Date;
  pointsAdded: boolean;
  estimatedTime?: string;
  notes?: string;
    uberQuoteId?: string;       // uber deliver quote id
  uberDeliveryId?: string;    // uber delivery id
  uberTrackingUrl?: string;   // rider traking 
  uberStatus?: string;        // uber delivery status ('picking_up', 'dropping_off', 'delivered')
  uberFee?: number;  
}

export interface IOrderDocument extends IOrder, Document {
  _id: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

export interface ICreateOrderInput {
  userId: string;
  orderType: OrderType;
  customerEmail: string;
  customerName?: string;
  customerPhone?: string;
  shippingAddress?: IShippingAddress;
  pickupTime?: string;
  notes?: string;
   uberQuoteId?:string, 
    uberFee?:number
}

export interface IPointRedemptionInput {
  userId: string;
  items: {
    productId: string;
    quantity: number;
  }[];
  deliveryType: 'pickup' | 'delivery';
  shippingAddress?: IShippingAddress;
  pickupTime?: string;
  notes?: string;
     uberQuoteId?: string;
  uberFee?: number;
}

export interface IOrderFilters {
  user?: string;
  orderStatus?: OrderStatus;
  orderType?: OrderType;
  paymentStatus?: PaymentStatus;
  paymentMethod?: PaymentMethod;
  search?: string;
  startDate?: string;
  endDate?: string;
}

export interface IPaginationOptions {
  page: number;
  limit: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}