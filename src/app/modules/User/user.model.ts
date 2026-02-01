import { model, Schema } from "mongoose";

import bcrypt from "bcrypt";

import { IUserMethods, TUser, User } from "./user.interface";
import { UserStatus } from "../Auth/auth.constant";
import config from "../../config";

const userSchema = new Schema<TUser, User, IUserMethods>(
  {
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    fullName: { type: String },
    image: { type: String },
    email: { type: String, required: true, unique: true },
    contact: { type: String, required: true },
    location: { type: String, required: true },
    dob: { type: Date, required: true },
    password: { type: String, required: true, select: false },
    verification: {
      code: {
        type: String,
        default: null,
      },
      expireDate: {
        type: Date,
        default: null,
      },
    },
 refercode: { type: String, unique: true, sparse: true },
    status: {
      type: String,
      required: true,
      enum: UserStatus,
      default: "in-progress",
    },

 role: { 
  type: String, 
  required: true, 
  enum: ["user", "admin", "superAdmin"], 
  default: "user" 
},

    fcmToken: { type: String, required: true },
    point: { type: Number, default:0},
    loyalityTier: { type: String,   enum: ["Silver", "Gold", "Platinum"], default: "Silver"},
    isOtpVerified: { type: Boolean, default: false },
    lastView:{ type: String },
    passwordChangedAt: { type: Date },
    lastBirthdayRewardYear: { type: Number, default: 0 },
    canClaimBirthdayReward: { type: Boolean, default: false },
  },
  {
    timestamps: true,
  }
);

userSchema.pre("save", async function () {
  if (this.isModified("password")) {
    this.password = await bcrypt.hash(
      this.password,
      Number(config.bcrypt_salt_rounds)
    );
  }

  // Always hash if verification.code exists and is not already hashed
  if (this.verification?.code && !this.verification.code.startsWith("$2b$")) {
    this.verification.code = bcrypt.hashSync(
      this.verification.code,
      Number(config.bcrypt_salt_rounds)
    );
  }
});

userSchema.methods.compareVerificationCode = function (userPlaneCode: string) {
  if (!this.verification?.code) return false;
  return bcrypt.compareSync(userPlaneCode, this.verification.code);
};

userSchema.post("save", function (doc, next) {
  doc.password = "";
  next();
});

userSchema.statics.isUserExistsByEmail = async function (email: string) {
  return await UserModel.findOne({ email }).select("+password");
};

userSchema.statics.isUserExistsById = async function (id: string) {
  return await UserModel.findById(id).select("+password");
};

userSchema.statics.isPasswordMatched = async function (
  plainTextPassword,
  hashedPassword
) {
  return await bcrypt.compare(plainTextPassword, hashedPassword);
};

userSchema.statics.isJWTIssuedBeforePasswordChanged = function (
  passwordChangedTimestamp: Date,
  jwtIssuedTimestamp: number
) {
  const passwordChangedTime =
    new Date(passwordChangedTimestamp).getTime() / 1000;
  return passwordChangedTime > jwtIssuedTimestamp;
};

export const UserModel = model<TUser, User>("User", userSchema);
