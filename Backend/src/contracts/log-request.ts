import { z } from "zod";

export const listLogsQuerySchema = z.object({
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
  limit: z.coerce.number().int().positive().max(200).optional(),
  cursor: z.string().min(1).optional(),
});

export type ListLogsQuery = z.infer<typeof listLogsQuerySchema>;