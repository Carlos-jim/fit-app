import { z } from "zod";

export const bootstrapUserRequestSchema = z.object({
  email: z.string().email(),
  fullName: z.string().trim().min(1).max(120).optional(),
});

export type BootstrapUserRequest = z.infer<typeof bootstrapUserRequestSchema>;
