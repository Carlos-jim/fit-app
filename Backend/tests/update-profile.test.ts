import { updateProfileSchema } from "../src/contracts/onboarding-request";

describe("updateProfileSchema", () => {
  it("rejects an empty payload", () => {
    const result = updateProfileSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it("accepts a partial payload", () => {
    const result = updateProfileSchema.safeParse({ weightKg: 78.5 });
    expect(result.success).toBe(true);
  });

  it("rejects a negative weight", () => {
    const result = updateProfileSchema.safeParse({ weightKg: -5 });
    expect(result.success).toBe(false);
  });

  it("rejects an unrealistic age", () => {
    expect(updateProfileSchema.safeParse({ age: 0 }).success).toBe(false);
    expect(updateProfileSchema.safeParse({ age: 121 }).success).toBe(false);
    expect(updateProfileSchema.safeParse({ age: 30 }).success).toBe(true);
  });

  it("rejects unknown enum values for goal", () => {
    expect(
      updateProfileSchema.safeParse({ goal: "EAT_MORE" }).success,
    ).toBe(false);
    expect(
      updateProfileSchema.safeParse({ goal: "MAINTAIN" }).success,
    ).toBe(true);
  });

  it("accepts all known enums", () => {
    expect(
      updateProfileSchema.safeParse({
        goal: "LOSE_WEIGHT",
        gender: "FEMALE",
        workoutFrequency: "MEDIUM",
        activityLevel: "ACTIVE",
      }).success,
    ).toBe(true);
  });

  it("accepts dietaryPrefs as opaque value (validated downstream)", () => {
    expect(
      updateProfileSchema.safeParse({
        dietaryPrefs: { vegan: true, allergies: ["peanut"] },
      }).success,
    ).toBe(true);
  });
});