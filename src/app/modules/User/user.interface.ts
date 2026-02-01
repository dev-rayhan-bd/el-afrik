/* eslint-disable no-unused-vars */
import mongoose, { Model } from "mongoose";
import { USER_ROLE } from "../Auth/auth.constant";

export interface TUser {
  _id?: mongoose.Types.ObjectId;
  firstName: string;
  lastName: string;
  fullName?: string;
  image?: string;
  email: string;

  password: string;
  dob: Date;
  contact: string;
  location: string;
  verification?: {
    code: string | null;
    expireDate: Date | null;
  };
  refercode: string;
  status: string;
  fcmToken: string;
  passwordChangedAt?: Date;
  role: TUserRole;
  point: number;
  loyalityTier: string;
  lastView: string;
  createdAt?: Date;
  updatedAt?: Date;
   isOtpVerified:boolean;
    lastBirthdayRewardYear?: number;
  canClaimBirthdayReward: boolean;
}

export interface IUserMethods {
  comparePassword(candidatePassword: string): Promise<boolean>;
  generateToken(): string;
  compareVerificationCode(userPlaneCode: string): boolean;
}

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface User extends Model<TUser, {}, IUserMethods> {
  //instance methods for checking if the user exist
  isUserExistsByEmail(email: string): Promise<TUser>;
  isUserExistsById(id: string): Promise<TUser>;
  //instance methods for checking password
  isPasswordMatched(
    plainTextPassword: string,
    hashedPassword: string
  ): Promise<boolean>;
  isJWTIssuedBeforePasswordChanged(
    passwordChangedTimestamp: Date,
    jwtIssuedTimestamp: number
  ): boolean;
}
export type TUserRole = keyof typeof USER_ROLE;
