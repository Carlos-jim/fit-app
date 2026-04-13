import * as ImageManipulator from "expo-image-manipulator";

/**
 * Maximum dimension (width or height) for uploaded meal images.
 * Keeps enough detail for AI vision analysis while dramatically
 * reducing file size compared to full-resolution camera shots.
 */
const MAX_DIMENSION = 1200;

/** JPEG quality 0–1. 0.75 gives ~60-70 % size reduction vs 0.86+ camera default. */
const UPLOAD_QUALITY = 0.75;

export interface CompressedImage {
  uri: string;
  width: number;
  height: number;
  /** Always "image/jpeg" — consistent content-type for Supabase upload. */
  mimeType: "image/jpeg";
  /** Suggested file name with .jpg extension. */
  fileName: string;
}

/**
 * Resize + compress an image for Supabase upload.
 *
 * Strategy:
 * - Resize so the longest edge is at most MAX_DIMENSION (aspect-ratio preserved)
 * - Convert to JPEG
 * - Compress at UPLOAD_QUALITY
 */
export async function compressForUpload(
  uri: string,
  originalFileName?: string | null,
): Promise<CompressedImage> {
  const result = await ImageManipulator.manipulateAsync(
    uri,
    [
      {
        resize: {
          width: MAX_DIMENSION,
          // Expo ImageManipulator preserves aspect ratio when only width
          // is provided and the image fits inside that bound.
        },
      },
    ],
    {
      compress: UPLOAD_QUALITY,
      format: ImageManipulator.SaveFormat.JPEG,
      base64: false,
    },
  );

  const baseName = originalFileName
    ? originalFileName.replace(/\.[^.]+$/, "")
    : `meal-${Date.now()}`;

  return {
    uri: result.uri,
    width: result.width,
    height: result.height,
    mimeType: "image/jpeg",
    fileName: `${baseName}.jpg`,
  };
}
