import { Schema, model } from 'mongoose';
import { ICateringPackageDocument, ICateringBookingDocument, BookingStatus, CateringPaymentStatus } from './cateringBooking.interface';

const CateringPackageSchema = new Schema<ICateringPackageDocument>({
  name: { type: String, required: true },
  description: { type: String, required: true },
  pricePerPerson: { type: Number, required: true },
  minGuests: { type: Number, default: 10 },
    menu: { 
    type: [String], 
    required: [true, 'Menu items are required'],
    validate: [(v:any) => Array.isArray(v) && v.length > 0, 'Menu must have at least one item']
  },
   image: { type: String,required:true},
}, { timestamps: true });

const CateringBookingSchema = new Schema<ICateringBookingDocument>({
  user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  package: { type: Schema.Types.ObjectId, ref: 'CateringPackage', required: true },
  eventDate: { type: Date, required: true },
  guestCount: { type: Number, required: true },
  totalPrice: { type: Number, required: true },
  venueAddress: { type: String, required: true },
  contactNumber: { type: String, required: true },
  paymentStatus: { type: String, enum: Object.values(CateringPaymentStatus), default: CateringPaymentStatus.PENDING },
  status: { type: String, enum: Object.values(BookingStatus), default: BookingStatus.PENDING },
  stripeSessionId: String,
  notes: String,
  uberQuoteId: String,
  uberDeliveryId: String,
  uberTrackingUrl: String,
  uberStatus: String,
  uberFee: { type: Number, default: 0 },
}, { timestamps: true });

export const CateringPackageModel = model<ICateringPackageDocument>('CateringPackage', CateringPackageSchema);
export const CateringBookingModel = model<ICateringBookingDocument>('CateringBooking', CateringBookingSchema);