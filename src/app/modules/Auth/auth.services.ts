import AppError from "../../errors/AppError";

import httpStatus from "http-status";
import { TLoginUser } from "./auth.interface";
import { createToken, verifyToken } from "./auth.utils";

import { JwtPayload } from "jsonwebtoken";
import bcrypt from "bcrypt";

import { TUser } from "../User/user.interface";
import { UserModel } from "../User/user.model";
import { generateReferCode } from "../../utils/generateReferCode";
import { sendMail } from "../../utils/sendMail";
import config from "../../config";

// register new user
const registeredUserIntoDB = async (payload: TUser) => {
  // console.log(payload);
  const user = await UserModel.isUserExistsByEmail(payload.email);
  // console.log(user);
  if (user) {
    throw new AppError(httpStatus.CONFLICT, "This user is already exists!");
  }
  // generate a unique refer code
  const refercode = await generateReferCode();
  // console.log("refercode",referCode);
  // attach referCode to payload
  const newUserData = {
    ...payload,
    refercode,
  };

  // console.log('new user data',newUserData);

  const result = await UserModel.create(newUserData);
  return result;
};
// login user
const loginUser = async (payload: TLoginUser) => {
  const user = await UserModel.isUserExistsByEmail(payload.email);
  // console.log('login user',user);
  if (!user) {
    throw new AppError(httpStatus.NOT_FOUND, "This user is not found!");
  }
  if (!(await UserModel.isPasswordMatched(payload?.password, user?.password))) {
    throw new AppError(httpStatus.UNAUTHORIZED, "Invalid Credentials!");
  }
  const jwtPayload = {
    userId: user._id!.toString(),
    role: user?.role,
  };

  const accessToken = createToken(
    jwtPayload,
    config.jwt_access_secret as string,
    config.jwt_access_expires_in as string
  );
  const refreshToken = createToken(
    jwtPayload,
    config.jwt_refresh_secret as string,
    config.jwt_refresh_expires_in as string
  );

  return {
    accessToken,
    refreshToken,
  };
};

// change password api
const changePassword = async (
  me: JwtPayload,
  payload: { oldPassword: string; newPassword: string }
) => {
  // console.log("me--->",me);
  // checking if the user is exist
  const user = await UserModel.isUserExistsById(me.userId);
  //   console.log('change pass user',user);
  if (!user) {
    throw new AppError(httpStatus.NOT_FOUND, "This user is not found !");
  }

  //checking if the password is correct

  if (!(await UserModel.isPasswordMatched(payload.oldPassword, user?.password)))
    throw new AppError(httpStatus.FORBIDDEN, "Password do not matched");

  //hash new password
  const newHashedPassword = await bcrypt.hash(
    payload.newPassword,
    Number(config.bcrypt_salt_rounds)
  );
  //   console.log('user data chnge pass 78 line',userData);
  await UserModel.findOneAndUpdate(
    {
      _id: me.userId,
      role: me.role,
    },
    {
      password: newHashedPassword,
      passwordChangedAt: new Date(),
    }
  );
  //   console.log('pass change 89 line',result);
  return null;
};
// forgot password api
const resetPassword = async (

  payload: {email:string,newPassword: string },
) => {
  // checking if the user is exist
  // console.log("payload->",payload);
  const user = await UserModel.isUserExistsByEmail(payload.email);
  //   console.log('change pass user',user);
  if (!user) {
    throw new AppError(httpStatus.NOT_FOUND, 'This user is not found !');
  }

  //checking if the password is correct




  //hash new password
  const newHashedPassword = await bcrypt.hash(
    payload.newPassword,
    Number(config.bcrypt_salt_rounds),
  );
  //   console.log('user data chnge pass 78 line',userData);
  await UserModel.findOneAndUpdate(
   { email: payload.email },
    {
      password: newHashedPassword,
      passwordChangedAt: new Date(),
    },
  );
  //   console.log('pass change 89 line',result);
  return null;
};

// refresh token

const refreshToken = async (token: string) => {
  // checking if the given token is valid
  const decoded = verifyToken(token, config.jwt_refresh_secret as string);

  const { userId, iat } = decoded;

  // checking if the user is exist
  const user = await UserModel.isUserExistsById(userId);

  if (!user) {
    throw new AppError(httpStatus.NOT_FOUND, "This user is not found !");
  }

  // checking if the user is blocked
  const userStatus = user?.status;

  if (userStatus === "blocked") {
    throw new AppError(httpStatus.FORBIDDEN, "This user is blocked ! !");
  }

  if (
    user.passwordChangedAt &&
    UserModel.isJWTIssuedBeforePasswordChanged(
      user.passwordChangedAt,
      iat as number
    )
  ) {
    throw new AppError(httpStatus.UNAUTHORIZED, "You are not authorized !");
  }

  const jwtPayload = {
    userId: user._id!.toString(),
    role: user?.role,
  };

  const accessToken = createToken(
    jwtPayload,
    config.jwt_access_secret as string,
    config.jwt_access_expires_in as string
  );

  return {
    accessToken,
  };
};

export const forgotPass = async (email: string) => {
  const user = await UserModel.findOne({ email });

  if (!user) {
    throw new AppError(httpStatus.NOT_FOUND, "User not found");
  }

  // 1. Generate 6-digit OTP
  const otp = Math.floor(100000 + Math.random() * 900000).toString();

  // 2. Save OTP + expiration to user object
  user.verification = {
    code: otp,
    expireDate: new Date(Date.now() + 1 * 60 * 1000), // 1 minute expiry
  };

  // 3. Save user to trigger pre-save hook (which hashes the OTP)
  await user.save();

  // 4. Send email
  await sendMail(
    email,
    "Your OTP Code",
    `Your OTP code is: ${otp}. It will expire in 1 minute.`
  );
};
export const verifyOTP = async (email: string, otp: string) => {
  const user = await UserModel.findOne({ email });
  if (!user) {
    throw new AppError(httpStatus.NOT_FOUND, "User not found");
  }

  //  Check OTP expiry
  if (
    !user.verification?.expireDate ||
    user.verification.expireDate < new Date()
  ) {
    throw new AppError(
      httpStatus.UNAUTHORIZED,
      "OTP has expired,resend Otp And try again"
    );
  }

  //  Compare OTP
  const isMatch = user.compareVerificationCode(otp);
  if (!isMatch) {
    throw new AppError(httpStatus.UNAUTHORIZED, "OTP not matched, try again");
  }

  //  If successful, you can clear the OTP
  user.verification = undefined;
  await user.save();

  return {
    status: httpStatus.OK,
    message: "OTP verified successfully",
  };
};

export const AuthServices = {
  registeredUserIntoDB,
  loginUser,
  changePassword,
  refreshToken,
  forgotPass,
  verifyOTP,
  resetPassword,
};
