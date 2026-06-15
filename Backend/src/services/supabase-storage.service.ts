import { randomUUID } from "node:crypto";
import { extname } from "node:path";

import { createClient } from "@supabase/supabase-js";

import { env } from "../config/env.js";
import { AppError } from "../lib/app-error.js";

const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

const extensionByContentType: Record<string, string> = {
  "image/gif": ".gif",
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
};

const SUPPORTED_CONTENT_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB

export interface StorageUploadPayload {
  uploadUrl: string;
  bucket: string;
  path: string;
  key: string;
  fileUrl: string;
  expiresInSeconds: number;
  requiredHeaders: Record<string, string>;
}

export interface SupabaseImageAsset {
  bucket: string;
  path: string;
  contentType: string;
  bytes: Buffer;
  publicUrl: string;
}

export class SupabaseStorageService {
  async createMealImageUploadUrl(input: {
    userId: string;
    fileName: string;
    contentType: string;
  }): Promise<StorageUploadPayload> {
    const normalizedFileName = input.fileName.replace(/\0/g, "").trim();

    if (normalizedFileName.length === 0) {
      throw new AppError("Invalid file name.", {
        statusCode: 400,
        code: "INVALID_FILE_NAME",
      });
    }

    if (normalizedFileName.includes("..") || /[\\/]/.test(normalizedFileName)) {
      throw new AppError("File name contains invalid characters.", {
        statusCode: 400,
        code: "INVALID_FILE_NAME",
      });
    }

    if (!SUPPORTED_CONTENT_TYPES.has(input.contentType)) {
      throw new AppError(
        "Unsupported image format. Allowed types: JPEG, PNG, WEBP, GIF.",
        {
          statusCode: 415,
          code: "UNSUPPORTED_MEDIA_TYPE",
        },
      );
    }

    const extension =
      extname(normalizedFileName).toLowerCase() ||
      extensionByContentType[input.contentType] ||
      ".jpg";

    const expectedExtension = extensionByContentType[input.contentType];
    if (expectedExtension && extension !== expectedExtension) {
      throw new AppError(
        `File extension does not match content type. Expected ${expectedExtension}.`,
        {
          statusCode: 400,
          code: "FILE_EXTENSION_MISMATCH",
        },
      );
    }

    const path = [
      "uploads",
      "meals",
      input.userId,
      `${new Date().toISOString().slice(0, 10)}-${randomUUID()}${extension}`,
    ].join("/");

    const storage = supabase.storage.from(env.SUPABASE_STORAGE_BUCKET);
    const { data, error } = await storage.createSignedUploadUrl(path);

    if (error || !data?.signedUrl) {
      throw new AppError("Failed to create Supabase upload URL.", {
        statusCode: 502,
        code: "UPLOAD_URL_CREATION_FAILED",
        cause: error,
      });
    }

    const { data: publicUrlData } = storage.getPublicUrl(path);

    return {
      uploadUrl: data.signedUrl,
      bucket: env.SUPABASE_STORAGE_BUCKET,
      path,
      key: path,
      fileUrl: publicUrlData.publicUrl,
      expiresInSeconds: env.STORAGE_SIGNED_UPLOAD_TTL_SECONDS,
      requiredHeaders: {
        "Content-Type": input.contentType,
        "x-upsert": "false",
      },
    };
  }

  async getImage(params: {
    bucket?: string;
    path: string;
  }): Promise<SupabaseImageAsset> {
    const bucket = params.bucket ?? env.SUPABASE_STORAGE_BUCKET;
    const storage = supabase.storage.from(bucket);
    const { data, error } = await storage.download(params.path);

    if (error || !data) {
      throw new AppError("Failed to load image from Supabase Storage.", {
        statusCode: error?.message?.toLowerCase().includes("not found") ? 404 : 502,
        code: error?.message?.toLowerCase().includes("not found")
          ? "STORAGE_OBJECT_NOT_FOUND"
          : "STORAGE_READ_FAILED",
        cause: error,
      });
    }

    const contentType = data.type || "application/octet-stream";

    if (!SUPPORTED_CONTENT_TYPES.has(contentType)) {
      throw new AppError(
        "Unsupported image format. Allowed types: JPEG, PNG, WEBP, GIF.",
        {
          statusCode: 415,
          code: "UNSUPPORTED_MEDIA_TYPE",
        },
      );
    }

    const bytes = Buffer.from(await data.arrayBuffer());

    if (bytes.length === 0) {
      throw new AppError("Stored image is empty.", {
        statusCode: 422,
        code: "EMPTY_IMAGE",
      });
    }

    if (bytes.length > MAX_FILE_SIZE_BYTES) {
      throw new AppError("Image exceeds maximum size of 10 MB.", {
        statusCode: 413,
        code: "IMAGE_TOO_LARGE",
      });
    }

    const { data: publicUrlData } = storage.getPublicUrl(params.path);

    return {
      bucket,
      path: params.path,
      contentType,
      bytes,
      publicUrl: publicUrlData.publicUrl,
    };
  }

  toDataUrl(asset: Pick<SupabaseImageAsset, "contentType" | "bytes">): string {
    return `data:${asset.contentType};base64,${asset.bytes.toString("base64")}`;
  }
}
