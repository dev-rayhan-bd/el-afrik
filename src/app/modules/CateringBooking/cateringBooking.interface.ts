import { Types, Document } from 'mongoose';

export enum BookingStatus {
  PENDING = 'pending',
  CONFIRMED = 'confirmed',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

export enum CateringPaymentStatus {
  PENDING = 'pending',
  PAID = 'paid',
}

export interface ICateringPackage {
  name: string;
  description: string;
  pricePerPerson: number;
  minGuests: number;
  menu: string[];
  image: string;
}

export interface ICateringBooking {
  user: Types.ObjectId;
  package: Types.ObjectId;
  eventDate: Date;
  guestCount: number;
  totalPrice: number;
  venueAddress: string;
  contactNumber: string;
  paymentStatus: CateringPaymentStatus;
  status: BookingStatus;
  stripeSessionId?: string;
  notes?: string;
}

export interface ICateringPackageDocument extends ICateringPackage, Document {}
export interface ICateringBookingDocument extends ICateringBooking, Document {}