import { ApiError } from "../src/services/bioma-api";

describe("ApiError", () => {
  it("preserves statusCode, code and details from the backend", () => {
    const err = new ApiError({
      message: "Email already registered",
      statusCode: 409,
      code: "EMAIL_TAKEN",
      details: { email: "x@y.com" },
    });
    expect(err.message).toBe("Email already registered");
    expect(err.statusCode).toBe(409);
    expect(err.code).toBe("EMAIL_TAKEN");
    expect(err.details).toEqual({ email: "x@y.com" });
  });

  it("isUnauthorized returns true on 401", () => {
    const err = new ApiError({
      message: "nope",
      statusCode: 401,
      code: "INVALID_TOKEN",
    });
    expect(err.isUnauthorized()).toBe(true);
    expect(err.isRateLimited()).toBe(false);
  });

  it("isRateLimited returns true on 429", () => {
    const err = new ApiError({
      message: "slow down",
      statusCode: 429,
      code: "RATE_LIMITED",
    });
    expect(err.isRateLimited()).toBe(true);
    expect(err.isUnauthorized()).toBe(false);
  });

  it("isValidation returns true on 4xx (not 401/429)", () => {
    const ok = new ApiError({
      message: "bad",
      statusCode: 422,
      code: "VALIDATION_FAILED",
    });
    expect(ok.isValidation()).toBe(true);
  });

  it("isValidation returns false on 5xx", () => {
    const serverError = new ApiError({
      message: "boom",
      statusCode: 500,
      code: "SERVER_ERROR",
    });
    expect(serverError.isValidation()).toBe(false);
  });
});