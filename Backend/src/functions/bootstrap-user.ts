import type {
  APIGatewayProxyEventV2,
  APIGatewayProxyStructuredResultV2,
} from "aws-lambda";

import { bootstrapUserRequestSchema } from "../contracts/bootstrap-user-request.js";
import { AppError } from "../lib/app-error.js";
import { jsonResponse, noContentResponse } from "../lib/http.js";
import { parseJsonBody } from "../lib/parse-json-body.js";
import { prisma } from "../lib/prisma.js";
import { UserRepository } from "../repositories/user.repository.js";

const userRepository = new UserRepository(prisma);

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

    const request = parseJsonBody(event, bootstrapUserRequestSchema);
    const user = await userRepository.ensureUser(request);

    return jsonResponse(200, {
      data: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
      },
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

  console.error("Unhandled error in bootstrap user Lambda", error);

  return jsonResponse(500, {
    error: "INTERNAL_SERVER_ERROR",
    message: "Unexpected error while bootstrapping user.",
  });
}
