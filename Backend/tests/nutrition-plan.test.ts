import { computeTdee, splitMacros } from "../src/services/nutrition-plan.service";

describe("computeTdee (Mifflin-St Jeor)", () => {
  it("returns null when essential inputs are missing", () => {
    expect(
      computeTdee({
        weightKg: null,
        heightCm: 170,
        age: 30,
        gender: "MALE",
        activityLevel: null,
        workoutFrequency: null,
        goal: null,
      }),
    ).toBeNull();
    expect(
      computeTdee({
        weightKg: 70,
        heightCm: null,
        age: 30,
        gender: "MALE",
        activityLevel: null,
        workoutFrequency: null,
        goal: null,
      }),
    ).toBeNull();
    expect(
      computeTdee({
        weightKg: 70,
        heightCm: 170,
        age: null,
        gender: "MALE",
        activityLevel: null,
        workoutFrequency: null,
        goal: null,
      }),
    ).toBeNull();
  });

  it("uses female formula when gender is FEMALE", () => {
    const result = computeTdee({
      weightKg: 60,
      heightCm: 165,
      age: 30,
      gender: "FEMALE",
      activityLevel: "MODERATE",
      workoutFrequency: null,
      goal: "MAINTAIN",
    });
    expect(result).not.toBeNull();
    // BMR for female: 10*60 + 6.5*165 - 5*30 - 161 = 600 + 1072.5 - 150 - 161 = 1361.5
    expect(result!.bmr).toBe(1362); // 1361.5 rounded
    // Maintenance with MODERATE multiplier 1.55
    expect(result!.maintenanceCalories).toBe(Math.round(1361.5 * 1.55));
  });

  it("uses male baseline when gender is MALE", () => {
    const result = computeTdee({
      weightKg: 80,
      heightCm: 180,
      age: 30,
      gender: "MALE",
      activityLevel: "SEDENTARY",
      workoutFrequency: null,
      goal: "MAINTAIN",
    });
    // BMR for male: 10*80 + 6.5*180 - 5*30 + 5 = 800 + 1170 - 150 + 5 = 1825
    expect(result!.bmr).toBe(1825);
  });

  it("applies LOSE_WEIGHT calorie deficit", () => {
    const result = computeTdee({
      weightKg: 80,
      heightCm: 180,
      age: 30,
      gender: "MALE",
      activityLevel: "MODERATE",
      workoutFrequency: null,
      goal: "LOSE_WEIGHT",
    });
    // Should be 20% under maintenance, but never below 1200
    expect(result!.targetCalories).toBeLessThan(result!.maintenanceCalories);
    expect(result!.targetCalories).toBeGreaterThanOrEqual(1200);
  });

  it("applies GAIN_WEIGHT calorie surplus", () => {
    const result = computeTdee({
      weightKg: 80,
      heightCm: 180,
      age: 30,
      gender: "MALE",
      activityLevel: "MODERATE",
      workoutFrequency: null,
      goal: "GAIN_WEIGHT",
    });
    expect(result!.targetCalories).toBeGreaterThan(result!.maintenanceCalories);
  });

  it("falls back to workout frequency when activity level is missing", () => {
    const result = computeTdee({
      weightKg: 80,
      heightCm: 180,
      age: 30,
      gender: "MALE",
      activityLevel: null,
      workoutFrequency: "HIGH",
      goal: "MAINTAIN",
    });
    // HIGH workout frequency maps to ACTIVE (1.725)
    const activeResult = computeTdee({
      weightKg: 80,
      heightCm: 180,
      age: 30,
      gender: "MALE",
      activityLevel: "ACTIVE",
      workoutFrequency: null,
      goal: "MAINTAIN",
    });
    expect(result!.maintenanceCalories).toBe(activeResult!.maintenanceCalories);
  });

  it("enforces a 1200 kcal minimum even for aggressive deficits", () => {
    const result = computeTdee({
      weightKg: 50,
      heightCm: 150,
      age: 70,
      gender: "FEMALE",
      activityLevel: "SEDENTARY",
      workoutFrequency: null,
      goal: "LOSE_WEIGHT",
    });
    expect(result!.targetCalories).toBe(1200);
  });
});

describe("splitMacros", () => {
  it("returns percentages that sum to 100", () => {
    const macros = splitMacros(2000, "MAINTAIN");
    expect(macros.proteinPercentage + macros.carbsPercentage + macros.fatPercentage).toBe(100);
  });

  it("adjusts split for LOSE_WEIGHT (higher protein, lower carbs)", () => {
    const macros = splitMacros(2000, "LOSE_WEIGHT");
    expect(macros.proteinPercentage).toBe(35);
    expect(macros.carbsPercentage).toBe(40);
    expect(macros.fatPercentage).toBe(25);
  });

  it("adjusts split for GAIN_WEIGHT (higher carbs)", () => {
    const macros = splitMacros(2500, "GAIN_WEIGHT");
    expect(macros.carbsPercentage).toBe(55);
  });

  it("rounds grams to integers", () => {
    const macros = splitMacros(2000, "MAINTAIN");
    expect(Number.isInteger(macros.proteinGrams)).toBe(true);
    expect(Number.isInteger(macros.carbsGrams)).toBe(true);
    expect(Number.isInteger(macros.fatGrams)).toBe(true);
  });

  it("returns a coherent calorie target when applied to grams", () => {
    // protein*4 + carbs*4 + fat*9 should be close to the input calories
    const total = 2000;
    const macros = splitMacros(total, "MAINTAIN");
    const back = macros.proteinGrams * 4 + macros.carbsGrams * 4 + macros.fatGrams * 9;
    expect(Math.abs(back - total)).toBeLessThan(total * 0.02); // within 2%
  });
});
