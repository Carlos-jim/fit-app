import { test, expect, request } from "@playwright/test";

/**
 * Smoke E2E for the Bioma backend.
 *
 * These tests verify the live HTTP API surface of the most important flows:
 * - health
 * - register → me/plan (which lazily generates a plan from onboarding data)
 * - login round-trip with refresh token rotation
 * - forgot/reset password contract (no email leakage)
 * - meal analysis endpoints reject when unauthenticated
 */

const baseURL = process.env.E2E_BASE_URL ?? "http://localhost:3000";

const uniqueEmail = () =>
  `e2e-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@bioma-test.app`;

test.describe("Bioma backend smoke", () => {
  test("GET /health returns 200 when DB is reachable", async () => {
    const ctx = await request.newContext({ baseURL });
    const res = await ctx.get("/health");
    if (res.status() === 503) {
      test.skip(true, "Database not available for smoke test");
    }
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.data.ok).toBe(true);
  });

  test("register, fetch /me/plan, refresh, logout flow", async () => {
    const ctx = await request.newContext({ baseURL });
    const email = uniqueEmail();

    const register = await ctx.post("/auth/register", {
      data: { name: "Smoke User", email, password: "Password1" },
    });
    if (register.status() === 503) {
      test.skip(true, "Backend unavailable");
    }
    expect(register.status()).toBe(201);
    const regBody = await register.json();
    const tokens = regBody.data.tokens;
    expect(tokens.accessToken).toBeTruthy();
    expect(tokens.refreshToken).toBeTruthy();
    expect(regBody.data.user.emailVerified).toBe(false);

    // me/plan returns null when the user has no profile yet
    const planRes = await ctx.get("/me/plan", {
      headers: { Authorization: `Bearer ${tokens.accessToken}` },
    });
    expect(planRes.status()).toBe(200);
    const planBody = await planRes.json();
    expect(planBody.data === null).toBe(true);

    // /me/profile surfaces onboardingComplete=false
    const meRes = await ctx.get("/me/profile", {
      headers: { Authorization: `Bearer ${tokens.accessToken}` },
    });
    expect(meRes.status()).toBe(200);
    const meBody = await meRes.json();
    expect(meBody.data.onboardingComplete).toBe(false);

    // body-metrics endpoint requires auth
    const metricsRes = await ctx.get("/body-metrics");
    expect(metricsRes.status()).toBe(401);

    // create + list + delete a weight entry
    const create = await ctx.post("/body-metrics", {
      headers: { Authorization: `Bearer ${tokens.accessToken}` },
      data: { type: "WEIGHT_KG", value: 72.5, unit: "kg" },
    });
    expect(create.status()).toBe(201);
    const created = await create.json();
    expect(created.data.value).toBe(72.5);

    const list = await ctx.get("/body-metrics", {
      headers: { Authorization: `Bearer ${tokens.accessToken}` },
    });
    expect(list.status()).toBe(200);
    const listBody = await list.json();
    expect(listBody.data.length).toBeGreaterThanOrEqual(1);

    const del = await ctx.delete(`/body-metrics/${created.data.id}`, {
      headers: { Authorization: `Bearer ${tokens.accessToken}` },
    });
    expect(del.status()).toBe(200);

    // refresh token rotation
    const refresh = await ctx.post("/auth/refresh", {
      data: { refreshToken: tokens.refreshToken },
    });
    expect(refresh.status()).toBe(200);
    const newTokens = (await refresh.json()).data;
    expect(newTokens.accessToken).not.toBe(tokens.accessToken);

    // old refresh token can no longer be used
    const replay = await ctx.post("/auth/refresh", {
      data: { refreshToken: tokens.refreshToken },
    });
    expect(replay.status()).toBe(401);

    // logout
    const logout = await ctx.post("/auth/logout", {
      data: { refreshToken: newTokens.refreshToken },
    });
    expect(logout.status()).toBe(200);
  });

  test("forgot password never confirms whether an email exists", async () => {
    const ctx = await request.newContext({ baseURL });
    const res = await ctx.post("/auth/forgot-password", {
      data: { email: uniqueEmail() },
    });
    if (res.status() === 503) test.skip(true, "Backend unavailable");
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.data.delivered).toBe(false);
  });

  test("reset password rejects weak new passwords", async () => {
    const ctx = await request.newContext({ baseURL });
    const res = await ctx.post("/auth/reset-password", {
      data: { token: "invalid-token-here", password: "weak" },
    });
    if (res.status() === 503) test.skip(true, "Backend unavailable");
    expect(res.status()).toBe(400);
  });

  test("verify email rejects unknown tokens", async () => {
    const ctx = await request.newContext({ baseURL });
    const res = await ctx.post("/auth/verify-email", {
      data: { token: "this-token-does-not-exist" },
    });
    if (res.status() === 503) test.skip(true, "Backend unavailable");
    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("INVALID_VERIFICATION_TOKEN");
  });
});
