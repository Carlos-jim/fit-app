export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly expose: boolean;

  constructor(
    message: string,
    options?: {
      statusCode?: number;
      code?: string;
      expose?: boolean;
      cause?: unknown;
    },
  ) {
    super(message, { cause: options?.cause });
    this.name = "AppError";
    this.statusCode = options?.statusCode ?? 500;
    this.code = options?.code ?? "INTERNAL_ERROR";
    this.expose = options?.expose ?? this.statusCode < 500;
  }
}
