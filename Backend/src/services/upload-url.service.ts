import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { randomUUID } from "node:crypto";
import { extname } from "node:path";

import { env } from "../config/env.js";
import { AppError } from "../lib/app-error.js";

const s3Client = new S3Client({
  region: env.AWS_REGION,
});

const extensionByContentType: Record<string, string> = {
  "image/gif": ".gif",
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
};

export interface UploadUrlPayload {
  uploadUrl: string;
  bucket: string;
  key: string;
  fileUrl: string;
  expiresInSeconds: number;
  requiredHeaders: Record<string, string>;
}

export class UploadUrlService {
  async createMealImageUploadUrl(input: {
    userId: string;
    fileName: string;
    contentType: string;
  }): Promise<UploadUrlPayload> {
    const extension =
      extname(input.fileName).toLowerCase() ||
      extensionByContentType[input.contentType] ||
      ".jpg";

    const key = [
      "uploads",
      "meals",
      input.userId,
      `${new Date().toISOString().slice(0, 10)}-${randomUUID()}${extension}`,
    ].join("/");

    try {
      const command = new PutObjectCommand({
        Bucket: env.S3_UPLOAD_BUCKET,
        Key: key,
        ContentType: input.contentType,
        Metadata: {
          originalFileName: input.fileName,
          userId: input.userId,
        },
      });

      const uploadUrl = await getSignedUrl(s3Client, command, {
        expiresIn: env.S3_SIGNED_URL_TTL_SECONDS,
      });

      return {
        uploadUrl,
        bucket: env.S3_UPLOAD_BUCKET,
        key,
        fileUrl: `s3://${env.S3_UPLOAD_BUCKET}/${key}`,
        expiresInSeconds: env.S3_SIGNED_URL_TTL_SECONDS,
        requiredHeaders: {
          "Content-Type": input.contentType,
        },
      };
    } catch (error) {
      throw new AppError("Failed to create upload URL.", {
        statusCode: 502,
        code: "UPLOAD_URL_CREATION_FAILED",
        cause: error,
      });
    }
  }
}
