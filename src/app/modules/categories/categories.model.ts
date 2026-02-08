import mongoose, { Schema } from "mongoose";
import { ICategories } from "./categories.interface";

// Mongoose schema
const CategorySchema: Schema = new Schema<ICategories>(
  {
      
    categoryName: { type: String, required: true, trim: true,unique: true },
    image: { type: String }, 

  },
  {
    timestamps: true,
  }
);

// Export model
const CategoryModel = mongoose.model<ICategories>('Categories', CategorySchema);

export default CategoryModel;
