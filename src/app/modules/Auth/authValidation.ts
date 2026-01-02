import { z } from "zod";

const loginValidationSchema = z.object({
  email: z.string().min(1, { message: "Email is required" }),
  password: z.string().min(1, { message: "Password is required" }),
});

const passwordSchema = z
  .string() // must be a string; non-strings will be rejected by Zod
  .min(8, { message: "Password must be at least 8 characters" })
  .max(128, { message: "Password must be at most 128 characters" })
  .refine((v) => v.trim() === v, {
    message: "Password cannot start or end with spaces",
  })
  .refine((v) => /[a-z]/.test(v), {
    message: "Password must contain at least one lowercase letter",
  })
  .refine((v) => /[A-Z]/.test(v), {
    message: "Password must contain at least one uppercase letter",
  })
  .refine((v) => /[^A-Za-z0-9]/.test(v), {
    message: "Password must contain at least one special character",
  });

export const registerUserValidationSchema = z
  .object({
    firstName: z
      .string({ message: "First name is required" })
      .trim()
      .min(1, { message: "First name cannot be empty" })
      .max(50, { message: "First name cannot exceed 50 characters" }),

    lastName: z
      .string({ message: "Last name is required" })
      .trim()
      .min(1, { message: "Last name cannot be empty" })
      .max(50, { message: "Last name cannot exceed 50 characters" }),

    email: z
      .string({ message: "Email is required" })
      .trim()
      .email({ message: "Invalid email address" })
      .toLowerCase(),

    password: passwordSchema,

    refercode: z.string().trim().optional(),
  })


export const editProfileSchema = z.object({
  firstName: z.string().min(1,"Name is required").optional(),
  lastName: z.string().min(1,"Name is required").optional(),
});

const forgotPasswordSchema = z.object({
  email: z.email("Invalid email address"),
});

export const verifyOtpSchema = z.object({
  email: z.string().email("Invalid email address"),
  otp: z
    .string()
    .length(6,"OTP must be exactly 6 digits")
    .regex(/^\d+$/,"OTP must contain only digits"),
});

const changePasswordValidationSchema = z.object({
  oldPassword: z.string().min(1, { message: "Old password is required"}),
  newPassword: z.string().min(1, { message: "New password is required"}),
});
const resetPasswordValidationSchema = z
  .object({
    email: z.string().email("Invalid email address"),
    newPassword: z.string().min(1, { message: "New password is required"}),
  })


const refreshTokenValidationSchema = z.object({
  refreshToken: z.string().min(1, { message: " token is required!"}),
});

export const AuthValidation = {
  loginValidationSchema,
  registerUserValidationSchema,
  editProfileSchema,
  forgotPasswordSchema,
  verifyOtpSchema,
  changePasswordValidationSchema,
  resetPasswordValidationSchema,
  refreshTokenValidationSchema,
};
