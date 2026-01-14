import mongoose, { Document } from 'mongoose';

export interface ICategories extends Document {
  categoryName: string;
  image?: string;     

}

