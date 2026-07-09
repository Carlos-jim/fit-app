import { parseDeepLink } from "../src/hooks/use-deep-links";

describe("parseDeepLink", () => {
  it("extracts path and query from a password-reset deep link", () => {
    const parsed = parseDeepLink(
      "bioma://reset-password?token=abc123&extra=ignored",
    );
    expect(parsed?.path).toBe("reset-password");
    expect(parsed?.params.token).toBe("abc123");
    expect(parsed?.params.extra).toBe("ignored");
  });

  it("extracts path and query from a verify-email deep link", () => {
    const parsed = parseDeepLink(
      "bioma://verify-email?token=tok&email=user@bioma.app",
    );
    expect(parsed?.path).toBe("verify-email");
    expect(parsed?.params.token).toBe("tok");
    expect(parsed?.params.email).toBe("user@bioma.app");
  });

  it("returns null for malformed URLs", () => {
    expect(parseDeepLink("not a url")).toBeNull();
  });

  it("returns null when the URL has no path component", () => {
    expect(parseDeepLink("bioma://")).toBeNull();
  });

  it("lower-cases the path so handlers can match case-insensitively", () => {
    const parsed = parseDeepLink("bioma://Reset-Password?token=x");
    expect(parsed?.path).toBe("reset-password");
  });
});