import type { APIGatewayProxyStructuredResultV2 } from "aws-lambda";

export function jsonResponse(
  statusCode: number,
  payload: unknown,
): APIGatewayProxyStructuredResultV2 {
  return {
    statusCode,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "access-control-allow-origin": "*",
      "access-control-allow-methods": "OPTIONS,GET,POST,PUT",
      "access-control-allow-headers": "content-type,authorization",
    },
    body: JSON.stringify(payload),
  };
}

export function noContentResponse(): APIGatewayProxyStructuredResultV2 {
  return {
    statusCode: 204,
    headers: {
      "access-control-allow-origin": "*",
      "access-control-allow-methods": "OPTIONS,GET,POST,PUT",
      "access-control-allow-headers": "content-type,authorization",
    },
  };
}
