import { z } from "zod";

export const generateTipsRequestSchema = z.object({
  force: z.boolean().optional(),
});

export type GenerateTipsRequest = z.infer<typeof generateTipsRequestSchema>;

export const tipsResponseJsonSchema = {
  type: "object",
  properties: {
    tips: {
      type: "array",
      items: {
        type: "object",
        properties: {
          title: { type: "string" },
          body: { type: "string" },
          category: {
            type: "string",
            enum: [
              "nutricion",
              "habitos",
              "ejercicio",
              "salud_mental",
              "planificacion",
            ],
          },
          icon: {
            type: "string",
            enum: [
              "nutrition",
              "fitness",
              "heart",
              "bulb",
              "restaurant",
              "water",
              "sleep",
              "sunny",
            ],
          },
        },
        required: ["title", "body", "category"],
      },
    },
  },
  required: ["tips"],
} as const;

export const tipItemSchema = z.object({
  title: z.string(),
  body: z.string(),
  category: z.enum([
    "nutricion",
    "habitos",
    "ejercicio",
    "salud_mental",
    "planificacion",
  ]),
  icon: z.enum([
    "nutrition",
    "fitness",
    "heart",
    "bulb",
    "restaurant",
    "water",
    "sleep",
    "sunny",
  ]).optional(),
});

export const tipsResponseSchema = z.object({
  tips: z.array(tipItemSchema),
});

export type TipsResponse = z.infer<typeof tipsResponseSchema>;
export type TipItem = z.infer<typeof tipItemSchema>;
