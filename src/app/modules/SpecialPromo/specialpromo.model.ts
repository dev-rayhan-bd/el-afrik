import { Schema, model } from 'mongoose';
import { ISpecialPromo } from './specialpromo.interface';



const SpecialPromoSchema = new Schema<ISpecialPromo>(
  {
    product: {
      type: Schema.Types.ObjectId,
      ref: 'Product',
      required: [true, 'Product ID is required'],
    },
    specialPromoCode: {
      type: String,
      required: [true, 'Special Promo code is required'],
    },
    validity: {
      type: Date,
      required: [true, 'Validity date is required'],
    },
    type: {
      type: String,
      required: [true, 'Type is required'],
        enum: ["holiday", "weekend", "limited"],
    },
  },
  {
    timestamps: true,
  }
);

/**
 * TTL INDEX: This is the magic part. 
 * MongoDB will automatically remove the document when current time > validity.
 */
SpecialPromoSchema.index({ validity: 1 }, { expireAfterSeconds: 0 });

export const SpecialPromoModel = model<ISpecialPromo>('SpecialPromo', SpecialPromoSchema);