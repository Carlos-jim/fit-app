import { z } from "zod";

export const createMealUploadUrlRequestSchema = z.object({
  fileName: z.string().trim().min(1).max(200),
  contentType: z.enum(["image/jpeg", "image/png", "image/webp", "image/gif"]),
});

export type CreateMealUploadUrlRequest = z.infer<
  typeof createMealUploadUrlRequestSchema
>;
