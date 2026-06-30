import { z } from "zod";

/**
 * Analyze-meal-image request.
 *
 * SOLID notes
 * ───────────
 * • ISP — we removed the legacy `base64Image` field. Clients that need
 *   to analyze an image now upload it to Supabase via
 *   `POST /uploads/meal-image-url` and send only the resulting `path`
 *   here. This keeps payloads small and the request shape minimal.
 * • LSP — the discriminated union guarantees callers either supply a
 *   `path` for already-uploaded images, or provide a `mealLabel` only
 *   when running text analysis (handled in the dedicated text endpoint).
 */
export const analyzeMealRequestSchema = z.object({
  path: z.string().min(1, "path is required"),
  bucket: z.string().min(1).optional(),
  mealLabel: z.string().trim().min(1).max(120).optional(),
  notes: z.string().trim().min(1).max(600).optional(),
  consumedAt: z.string().datetime().optional(),
});

export type AnalyzeMealRequest = z.infer<typeof analyzeMealRequestSchema>;