import { z } from "zod";

const emailSchema = z
  .string({ message: "Email is required" })
  .trim()
  .email({ message: "Invalid email address" })
  .toLowerCase();

const passwordSchema = z
  .string({ message: "Password is required" })
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


const contactSchema = z
  .string({ message: "Contact is required" })
  .trim()
  .min(1, { message: "Contact is required" })
  .max(20, { message: "Contact cannot exceed 20 characters" });

const locationSchema = z
  .string({ message: "Location is required" })
  .trim()
  .min(1, { message: "Location is required" })
  .max(100, { message: "Location cannot exceed 100 characters" });


const dobSchema = z
  .union([
    z.date(),
    z
      .string({ message: "Date of birth is required" })
      .trim()
      .min(1, { message: "Date of birth is required" }),
  ])
  .transform((v) => (v instanceof Date ? v : new Date(v)))
  .refine((d) => !Number.isNaN(d.getTime()), { message: "Invalid date of birth" });

const loginValidationSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, { message: "Password is required" }),
    fcmToken: z.string({ message: "fcmToken is required" }).trim(),
});
const AdminloginValidationSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, { message: "Password is required" }),

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
    fcmToken: z
      .string({ message: "fcmToken is required" })
      .trim(),

    email: emailSchema,


    contact: contactSchema,

    location: locationSchema,

    dob: dobSchema,

    password: passwordSchema,
  })



export const editProfileSchema = z
  .object({
    firstName: z
      .string()
      .trim()
      .min(1, "First name is required")
      .max(50, "First name cannot exceed 50 characters")
      .optional(),

    lastName: z
      .string()
      .trim()
      .min(1, "Last name is required")
      .max(50, "Last name cannot exceed 50 characters")
      .optional(),

    contact: contactSchema.optional(),

    location: locationSchema.optional(),

    dob: dobSchema.optional(),
  })


/**
 * Forgot/Verify OTP
 */
const forgotPasswordSchema = z.object({
  email: emailSchema,
});

export const verifyOtpSchema = z.object({
  email: emailSchema,
  otp: z
    .string({ message: "OTP is required" })
    .length(6, "OTP must be exactly 6 digits")
    .regex(/^\d+$/, "OTP must contain only digits"),
});

/**
 * Password change/reset
 */
const changePasswordValidationSchema = z.object({
  oldPassword: z.string().min(1, { message: "Old password is required" }),
  newPassword: passwordSchema,
});

const resetPasswordValidationSchema = z.object({
  email: emailSchema,
  newPassword: passwordSchema,
});

/**
 * Refresh token
 */
const refreshTokenValidationSchema = z.object({
  refreshToken: z.string().min(1, { message: "Refresh Token is required!" }),
});

export const AuthValidation = {
  loginValidationSchema,
  AdminloginValidationSchema,
  registerUserValidationSchema,
  editProfileSchema,
  forgotPasswordSchema,
  verifyOtpSchema,
  changePasswordValidationSchema,
  resetPasswordValidationSchema,
  refreshTokenValidationSchema,
};
