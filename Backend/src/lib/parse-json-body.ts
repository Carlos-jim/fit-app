import type { APIGatewayProxyEventV2 } from "aws-lambda";
import { ZodSchema } from "zod";

import { AppError } from "./app-error.js";

export function parseJsonBody<T>(
  event: APIGatewayProxyEventV2,
  schema: ZodSchema<T>,
): T {
  if (!event.body) {
    throw new AppError("Request body is required.", {
      statusCode: 400,
      code: "MISSING_BODY",
    });
  }

  let parsedBody: unknown;

  try {
    parsedBody = event.isBase64Encoded
      ? JSON.parse(Buffer.from(event.body, "base64").toString("utf-8"))
      : JSON.parse(event.body);
  } catch (error) {
    throw new AppError("Body must be valid JSON.", {
      statusCode: 400,
      code: "INVALID_JSON",
      cause: error,
    });
  }

  const result = schema.safeParse(parsedBody);

  if (!result.success) {
    throw new AppError("Invalid request payload.", {
      statusCode: 422,
      code: "VALIDATION_ERROR",
      cause: result.error.flatten(),
    });
  }

  return result.data;
}
