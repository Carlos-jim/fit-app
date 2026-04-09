import { GetObjectCommand, NoSuchKey, S3Client } from "@aws-sdk/client-s3";

import { env } from "../config/env.js";
import { AppError } from "../lib/app-error.js";

const s3Client = new S3Client({
  region: env.AWS_REGION,
});

const SUPPORTED_CONTENT_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

export interface S3ImageAsset {
  bucket: string;
  key: string;
  contentType: string;
  bytes: Buffer;
  publicUrl: string;
}

export class S3ImageService {
  async getImage(params: {
    bucket?: string;
    key: string;
  }): Promise<S3ImageAsset> {
    const bucket = params.bucket ?? env.S3_UPLOAD_BUCKET;

    try {
      const response = await s3Client.send(
        new GetObjectCommand({
          Bucket: bucket,
          Key: params.key,
        }),
      );

      if (!response.Body) {
        throw new AppError("S3 object body is empty.", {
          statusCode: 422,
          code: "EMPTY_S3_OBJECT",
        });
      }

      const contentType = response.ContentType ?? "application/octet-stream";

      if (!SUPPORTED_CONTENT_TYPES.has(contentType)) {
        throw new AppError(
          "Unsupported image format. Allowed types: JPEG, PNG, WEBP, GIF.",
          {
            statusCode: 415,
            code: "UNSUPPORTED_MEDIA_TYPE",
          },
        );
      }

      const bytes = Buffer.from(await response.Body.transformToByteArray());

      if (bytes.length === 0) {
        throw new AppError("S3 image is empty.", {
          statusCode: 422,
          code: "EMPTY_IMAGE",
        });
      }

      return {
        bucket,
        key: params.key,
        contentType,
        bytes,
        publicUrl: `s3://${bucket}/${params.key}`,
      };
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }

      if (error instanceof NoSuchKey) {
        throw new AppError("Image not found in S3.", {
          statusCode: 404,
          code: "S3_OBJECT_NOT_FOUND",
          cause: error,
        });
      }

      throw new AppError("Failed to load image from S3.", {
        statusCode: 502,
        code: "S3_READ_FAILED",
        cause: error,
      });
    }
  }

  toDataUrl(asset: Pick<S3ImageAsset, "contentType" | "bytes">): string {
    return `data:${asset.contentType};base64,${asset.bytes.toString("base64")}`;
  }
}
