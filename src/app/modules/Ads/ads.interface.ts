import { Document } from 'mongoose';

export interface IAds extends Document {
  images: string[];
}