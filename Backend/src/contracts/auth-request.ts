import { z } from "zod";

export const registerRequestSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export const loginRequestSchema = z.object({
  email: z.string().email("Invalid email"),
  password: z.string().min(1, "Password is required"),
});

export const googleLoginRequestSchema = z.object({
  idToken: z.string().min(1, "Google ID token is required"),
});

export type RegisterRequest = z.infer<typeof registerRequestSchema>;
export type LoginRequest = z.infer<typeof loginRequestSchema>;
export type GoogleLoginRequest = z.infer<typeof googleLoginRequestSchema>;
