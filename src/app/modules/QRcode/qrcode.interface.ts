import { Types, Document } from 'mongoose';

export interface IQRCode extends Document {
  title: string;
  code: string;      
  points: number;    
  isUsed: boolean;  
  usedBy?: Types.ObjectId; 
  expiryDate: Date; 
}