// import { Types, Document } from 'mongoose';

// export enum BookingStatus {
//   PENDING = 'pending',
//   CONFIRMED = 'confirmed',
//   COMPLETED = 'completed',
//   CANCELLED = 'cancelled',
// }

// export enum CateringPaymentStatus {
//   PENDING = 'pending',
//   PAID = 'paid',
// }
// export enum CateringPricingType {
//   PER_PERSON = 'per_person',
//   PER_TRAY = 'per_tray',
//   PER_ITEM = 'per_item',
// }

// export interface ICateringPackage {
//   name: string;
//   description: string;
//   pricingType: CateringPricingType;
//   minGuests: number;
//   menu: string[];
//   image: string;
// }

// export interface ICateringBooking {
//   user: Types.ObjectId;
//   package: Types.ObjectId;
//   eventDate: Date;
//   guestCount: number;
//   totalPrice: number;
//   venueAddress: string;
//   contactNumber: string;
//   paymentStatus: CateringPaymentStatus;
//    pricingType: CateringPricingType;
//   status: BookingStatus;
//   stripeSessionId?: string;
//   notes?: string;
//     uberQuoteId?: string;       // uber deliver quote id
//   uberDeliveryId?: string;    // uber delivery id
//   uberTrackingUrl?: string;   // rider traking 
//   uberStatus?: string;        // uber delivery status ('picking_up', 'dropping_off', 'delivered')
//   uberFee?: number;  
// }

// export interface ICateringPackageDocument extends ICateringPackage, Document {}
// export interface ICateringBookingDocument extends ICateringBooking, Document {}
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

export enum CateringPricingType {
  PER_PERSON = 'per_person',
  PER_TRAY = 'per_tray',
  PER_ITEM = 'per_item',
}

export interface ICateringPackage {
  name: string;
  description: string;
  price: number; 
  pricingType: CateringPricingType;
  minOrderQuantity: number;
  menu: string[];
  image: string;
}

export interface ICateringBooking {
  user: Types.ObjectId;
  package: Types.ObjectId;
  eventDate: Date;
  quantity: number; 
  totalPrice: number;
  venueAddress: string;
  contactNumber: string;
  pricingType: CateringPricingType;
  paymentStatus: CateringPaymentStatus;
  status: BookingStatus;
  stripeSessionId?: string;
  notes?: string;
       uberQuoteId?: string;       // uber deliver quote id
  uberDeliveryId?: string;    // uber delivery id
  uberTrackingUrl?: string;   // rider traking 
  uberStatus?: string;        // uber delivery status ('picking_up', 'dropping_off', 'delivered')
  uberFee?: number; 
}

export interface ICateringPackageDocument extends ICateringPackage, Document {}
export interface ICateringBookingDocument extends ICateringBooking, Document {}