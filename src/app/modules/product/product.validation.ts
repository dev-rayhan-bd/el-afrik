import { z } from "zod";
import mongoose from "mongoose";


const objectId = z
  .string()
  .trim()
  .refine((val) => mongoose.Types.ObjectId.isValid(val), {
    message: "Invalid ObjectId",
  });

// Choose ONE: number() for JSON, coerce.number() for form-data
const nonNegativeNumber = (field: string) =>
  z.coerce
    .number()
    .refine((v) => Number.isFinite(v), { message: `${field} must be a number` })
    .min(0, `${field} cannot be negative`);


const ProductStatusZod = z.enum(["in_stock", "out_of_stock"]);

export const createProductSchema = z.object({
  body: z
    .object({
      name: z
        .string()
        .trim()
        .min(1, "Product name is required")
        .max(100, "Name cannot exceed 100 characters"),

      

      weight: nonNegativeNumber("Weight"),

      category: objectId, // required by default

      price: nonNegativeNumber("Price"),

      quantity: nonNegativeNumber("Quantity").optional().default(0),

      status: ProductStatusZod.optional(),

      deliveryFee: nonNegativeNumber("Delivery fee").optional().default(0),

      points: nonNegativeNumber("Points").optional().default(0),

      description: z
        .string()
        .trim()
        .min(1, "Description is required")
        .max(2000, "Description cannot exceed 2000 characters"),

      promo: z.string().trim().min(1, "Promo code is required"),

      isFavourite: z.boolean().optional().default(false),
    })
    .strict(),
});

export const updateProductSchema = z.object({
  body: z
    .object({
      name: z.string().trim().min(1).max(100).optional(),
      images: z.array(z.string().trim().min(1)).min(1).optional(),
      weight: z.coerce.number().min(0).optional(),
      category: objectId.optional(),
      price: z.coerce.number().min(0).optional(),
      quantity: z.coerce.number().min(0).optional(),
      status: ProductStatusZod.optional(),
      deliveryFee: z.coerce.number().min(0).optional(),
      points: z.coerce.number().min(0).optional(),
      description: z.string().trim().min(1).max(2000).optional(),
      promo: z.string().trim().min(1).optional(),
      isFavourite: z.boolean().optional(),
    })
    .strict(),
});
