import type {
  APIGatewayProxyEventV2,
  APIGatewayProxyStructuredResultV2,
} from "aws-lambda";

import { jsonResponse, noContentResponse } from "../lib/http.js";
import { prisma } from "../lib/prisma.js";
import { LogRepository } from "../repositories/log.repository.js";

const logRepository = new LogRepository(prisma);

export async function handler(
  event: APIGatewayProxyEventV2,
): Promise<APIGatewayProxyStructuredResultV2> {
  try {
    if (event.requestContext.http.method === "OPTIONS") {
      return noContentResponse();
    }

    if (event.requestContext.http.method !== "GET") {
      return jsonResponse(405, {
        error: "METHOD_NOT_ALLOWED",
        message: "Only GET is supported.",
      });
    }

    const userId = event.queryStringParameters?.userId;

    if (!userId) {
      return jsonResponse(400, {
        error: "MISSING_USER_ID",
        message: "userId query parameter is required.",
      });
    }

    const logs = await logRepository.getUserLogs(userId);

    return jsonResponse(200, { data: logs });
  } catch (error) {
    console.error("Unhandled error in get-logs Lambda", error);

    return jsonResponse(500, {
      error: "INTERNAL_SERVER_ERROR",
      message: "Unexpected error while fetching meal logs.",
    });
  }
}
