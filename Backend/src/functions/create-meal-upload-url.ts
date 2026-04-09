import type {
  APIGatewayProxyEventV2,
  APIGatewayProxyStructuredResultV2,
} from "aws-lambda";

import { createMealUploadUrlRequestSchema } from "../contracts/create-meal-upload-url-request.js";
import { AppError } from "../lib/app-error.js";
import { jsonResponse, noContentResponse } from "../lib/http.js";
import { parseJsonBody } from "../lib/parse-json-body.js";
import { prisma } from "../lib/prisma.js";
import { UserRepository } from "../repositories/user.repository.js";
import { UploadUrlService } from "../services/upload-url.service.js";

const userRepository = new UserRepository(prisma);
const uploadUrlService = new UploadUrlService();

export async function handler(
  event: APIGatewayProxyEventV2,
): Promise<APIGatewayProxyStructuredResultV2> {
  try {
    if (event.requestContext.http.method === "OPTIONS") {
      return noContentResponse();
    }

    if (event.requestContext.http.method !== "POST") {
      return jsonResponse(405, {
        error: "METHOD_NOT_ALLOWED",
        message: "Only POST is supported.",
      });
    }

    const request = parseJsonBody(event, createMealUploadUrlRequestSchema);
    const userExists = await userRepository.exists(request.userId);

    if (!userExists) {
      throw new AppError("User not found.", {
        statusCode: 404,
        code: "USER_NOT_FOUND",
      });
    }

    const upload = await uploadUrlService.createMealImageUploadUrl(request);

    return jsonResponse(200, {
      data: upload,
    });
  } catch (error) {
    return handleError(error);
  }
}

function handleError(error: unknown): APIGatewayProxyStructuredResultV2 {
  if (error instanceof AppError) {
    return jsonResponse(error.statusCode, {
      error: error.code,
      message: error.message,
      details: error.expose ? error.cause ?? null : null,
    });
  }

  console.error("Unhandled error in create upload URL Lambda", error);

  return jsonResponse(500, {
    error: "INTERNAL_SERVER_ERROR",
    message: "Unexpected error while creating upload URL.",
  });
}
