const mockStorageFrom = jest.fn();
const mockCreateSignedUploadUrl = jest.fn();
const mockDownload = jest.fn();
const mockGetPublicUrl = jest.fn();

jest.mock("@supabase/supabase-js", () => ({
  createClient: jest.fn(() => ({
    storage: {
      from: mockStorageFrom,
    },
  })),
}));

import { SupabaseStorageService } from "../src/services/supabase-storage.service";

function makeStorage() {
  return {
    createSignedUploadUrl: mockCreateSignedUploadUrl,
    download: mockDownload,
    getPublicUrl: mockGetPublicUrl,
  };
}

describe("SupabaseStorageService.createMealImageUploadUrl", () => {
  beforeEach(() => {
    mockStorageFrom.mockReset();
    mockCreateSignedUploadUrl.mockReset();
    mockGetPublicUrl.mockReset();
  });

  it("rejects unsupported content types with 415", async () => {
    const svc = new SupabaseStorageService();
    await expect(
      svc.createMealImageUploadUrl({
        userId: "u-1",
        fileName: "meal.bmp",
        contentType: "image/bmp",
      }),
    ).rejects.toMatchObject({ code: "UNSUPPORTED_MEDIA_TYPE" });
  });

  it("rejects path-traversal attempts in the filename", async () => {
    const svc = new SupabaseStorageService();
    await expect(
      svc.createMealImageUploadUrl({
        userId: "u-1",
        fileName: "../etc/passwd.jpg",
        contentType: "image/jpeg",
      }),
    ).rejects.toMatchObject({ code: "INVALID_FILE_NAME" });
  });

  it("rejects filename/contentType mismatches", async () => {
    const svc = new SupabaseStorageService();
    await expect(
      svc.createMealImageUploadUrl({
        userId: "u-1",
        fileName: "meal.png",
        contentType: "image/jpeg",
      }),
    ).rejects.toMatchObject({ code: "FILE_EXTENSION_MISMATCH" });
  });

  it("returns the signed upload payload on success", async () => {
    mockStorageFrom.mockReturnValue(makeStorage());
    mockCreateSignedUploadUrl.mockResolvedValue({
      data: { signedUrl: "https://signed.example/upload" },
      error: null,
    });
    mockGetPublicUrl.mockReturnValue({
      data: { publicUrl: "https://public.example/meal.jpg" },
    });

    const svc = new SupabaseStorageService();
    const result = await svc.createMealImageUploadUrl({
      userId: "u-1",
      fileName: "meal.jpg",
      contentType: "image/jpeg",
    });

    expect(result.uploadUrl).toBe("https://signed.example/upload");
    expect(result.bucket).toBe("test-bucket");
    expect(result.path).toContain("uploads/meals/u-1/");
    expect(result.path.endsWith(".jpg")).toBe(true);
    expect(result.fileUrl).toBe("https://public.example/meal.jpg");
  });

  it("surfaces Supabase errors with a structured AppError", async () => {
    mockStorageFrom.mockReturnValue(makeStorage());
    mockCreateSignedUploadUrl.mockResolvedValue({
      data: null,
      error: { message: "bucket not found" },
    });
    const svc = new SupabaseStorageService();
    await expect(
      svc.createMealImageUploadUrl({
        userId: "u-1",
        fileName: "meal.jpg",
        contentType: "image/jpeg",
      }),
    ).rejects.toMatchObject({ code: "UPLOAD_URL_CREATION_FAILED" });
  });
});

describe("SupabaseStorageService.getImage", () => {
  beforeEach(() => {
    mockStorageFrom.mockReset();
    mockDownload.mockReset();
    mockGetPublicUrl.mockReset();
  });

  it("downloads and returns the image with publicUrl", async () => {
    const bytes = new Uint8Array([1, 2, 3, 4]);
    mockStorageFrom.mockReturnValue(makeStorage());
    mockDownload.mockResolvedValue({
      data: { arrayBuffer: () => bytes.buffer, type: "image/jpeg" },
      error: null,
    });
    mockGetPublicUrl.mockReturnValue({
      data: { publicUrl: "https://public.example/m.jpg" },
    });
    const svc = new SupabaseStorageService();
    const out = await svc.getImage({ path: "uploads/meals/u-1/x.jpg" });
    expect(out.contentType).toBe("image/jpeg");
    expect(out.bytes.length).toBe(4);
    expect(out.publicUrl).toBe("https://public.example/m.jpg");
  });

  it("rejects content-types the bucket should not return", async () => {
    const bytes = new Uint8Array([0]);
    mockStorageFrom.mockReturnValue(makeStorage());
    mockDownload.mockResolvedValue({
      data: { arrayBuffer: () => bytes.buffer, type: "application/pdf" },
      error: null,
    });
    const svc = new SupabaseStorageService();
    await expect(
      svc.getImage({ path: "uploads/meals/u-1/x.pdf" }),
    ).rejects.toMatchObject({ code: "UNSUPPORTED_MEDIA_TYPE" });
  });
});