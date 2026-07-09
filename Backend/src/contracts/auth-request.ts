import { z } from "zod";

export const registerRequestSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[a-z]/, "Password must contain at least one lowercase letter")
    .regex(/[0-9]/, "Password must contain at least one number"),
});

export const loginRequestSchema = z.object({
  email: z.string().email("Invalid email"),
  password: z.string().min(1, "Password is required"),
});

export const googleLoginRequestSchema = z.object({
  idToken: z.string().min(1, "Google ID token is required"),
});

export const forgotPasswordRequestSchema = z.object({
  email: z.string().email("Invalid email"),
});

export const resetPasswordRequestSchema = z.object({
  token: z.string().min(10, "Invalid token"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[a-z]/, "Password must contain at least one lowercase letter")
    .regex(/[0-9]/, "Password must contain at least one number"),
});

export const verifyEmailRequestSchema = z.object({
  token: z.string().min(10, "Invalid token"),
});

export const resendVerificationRequestSchema = z.object({
  email: z.string().email("Invalid email"),
});

export const refreshTokenRequestSchema = z.object({
  refreshToken: z.string().min(10, "Invalid refresh token"),
});

export const logoutRequestSchema = z.object({
  refreshToken: z.string().min(10, "Invalid refresh token"),
});

export type RegisterRequest = z.infer<typeof registerRequestSchema>;
export type LoginRequest = z.infer<typeof loginRequestSchema>;
export type GoogleLoginRequest = z.infer<typeof googleLoginRequestSchema>;
export type ForgotPasswordRequest = z.infer<typeof forgotPasswordRequestSchema>;
export type ResetPasswordRequest = z.infer<typeof resetPasswordRequestSchema>;
export type VerifyEmailRequest = z.infer<typeof verifyEmailRequestSchema>;
export type ResendVerificationRequest = z.infer<typeof resendVerificationRequestSchema>;
export type RefreshTokenRequest = z.infer<typeof refreshTokenRequestSchema>;
export type LogoutRequest = z.infer<typeof logoutRequestSchema>;
