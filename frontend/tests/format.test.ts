import { clamp, getFirstName } from "../src/utils/format";

describe("getFirstName", () => {
  it("returns the fallback for empty / whitespace input", () => {
    expect(getFirstName("")).toBe("Bioma");
    expect(getFirstName("   ")).toBe("Bioma");
  });

  it("returns the first token for single-word names", () => {
    expect(getFirstName("Valentina")).toBe("Valentina");
  });

  it("returns the first token for two-word names", () => {
    expect(getFirstName("María Pérez")).toBe("María");
    expect(getFirstName("Juan Soto")).toBe("Juan");
  });

  it("preserves compound first names like 'María José'", () => {
    expect(getFirstName("María José López")).toBe("María José");
  });

  it("drops lowercase-prefixed surnames (e.g. Dutch 'van')", () => {
    expect(getFirstName("Wouter van der Berg")).toBe("Wouter");
  });
});

describe("clamp", () => {
  it("clamps below the min", () => {
    expect(clamp(-5, 0, 10)).toBe(0);
  });
  it("clamps above the max", () => {
    expect(clamp(15, 0, 10)).toBe(10);
  });
  it("passes through values inside the range", () => {
    expect(clamp(5, 0, 10)).toBe(5);
  });
});