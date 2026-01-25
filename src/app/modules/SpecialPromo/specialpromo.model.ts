import { model, Schema } from "mongoose";
import { ISpecialPromo } from "./specialpromo.interface";

const SpecialPromoSchema = new Schema<ISpecialPromo>({
  product: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
  specialPromoCode: { type: String, required: true }, 
  discountType: { type: String, enum: ['percentage', 'fixed'], required: true },
  discountAmount: { type: Number, required: true },
  validity: { type: Date, required: true },
  type: { type: String,enum: ['holiday', 'weekend','limited'], required: true },
}, { timestamps: true });

SpecialPromoSchema.index({ validity: 1 }, { expireAfterSeconds: 0 });
export const SpecialPromoModel = model<ISpecialPromo>('SpecialPromo', SpecialPromoSchema);