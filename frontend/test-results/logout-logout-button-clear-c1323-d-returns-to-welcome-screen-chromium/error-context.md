# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: logout.spec.ts >> logout button clears session and returns to welcome screen
- Location: e2e\logout.spec.ts:9:5

# Error details

```
Error: expect(received).toBe(expected) // Object.is equality

Expected: 201
Received: 429
```

# Test source

```ts
  1  | import { test, expect } from "@playwright/test";
  2  | 
  3  | const FRONTEND_URL = process.env.E2E_FRONTEND_URL ?? "http://localhost:8081";
  4  | const BACKEND_URL = process.env.E2E_BASE_URL ?? "http://localhost:3000";
  5  | 
  6  | const uniqueEmail = () =>
  7  |   `logout-ui-${Date.now()}-${Math.random().toString(36).slice(2, 6)}@bioma-test.app`;
  8  | 
  9  | test("logout button clears session and returns to welcome screen", async ({ page, request }) => {
  10 |   test.setTimeout(60_000);
  11 | 
  12 |   const email = uniqueEmail();
  13 |   const password = "Password1";
  14 | 
  15 |   const reg = await request.post(`${BACKEND_URL}/auth/register`, {
  16 |     data: { name: "Logout UI", email, password },
  17 |   });
  18 |   if (reg.status() === 503) test.skip(true, "Backend unavailable");
  19 |   if (reg.status() !== 201) {
  20 |     console.error("REGISTER FAILED:", reg.status(), await reg.text());
  21 |   }
> 22 |   expect(reg.status()).toBe(201);
     |                        ^ Error: expect(received).toBe(expected) // Object.is equality
  23 | 
  24 |   await page.goto(FRONTEND_URL, { waitUntil: "domcontentloaded" });
  25 |   await page.getByText(/inicia sesi[oó]n/i).first().click({ timeout: 10_000 });
  26 | 
  27 |   await page.getByPlaceholder(/correo|email/i).first().fill(email);
  28 |   await page.getByPlaceholder(/contrase|password/i).first().fill(password);
  29 |   await page.getByText(/^log in$/i).first().click({ timeout: 10_000 });
  30 | 
  31 |   await page.waitForTimeout(3_000);
  32 | 
  33 |   const profileTab = page.getByRole("button", { name: /perfil|profile/i }).first();
  34 |   if (await profileTab.isVisible({ timeout: 5_000 }).catch(() => false)) {
  35 |     await profileTab.click();
  36 |   }
  37 |   await page.waitForTimeout(1_500);
  38 | 
  39 |   await page.screenshot({ path: "logout-1-profile.png", fullPage: true });
  40 | 
  41 |   const logoutBtn = page.getByText(/cerrar sesi[oó]n/i).first();
  42 |   await logoutBtn.waitFor({ state: "visible", timeout: 5_000 });
  43 |   await logoutBtn.click();
  44 | 
  45 |   await page.waitForTimeout(500);
  46 |   await page.screenshot({ path: "logout-2-confirm.png", fullPage: true });
  47 | 
  48 |   const confirmBtn = page
  49 |     .getByRole("button", { name: /^cerrar sesi[oó]n$/i })
  50 |     .last();
  51 |   await confirmBtn.click({ timeout: 5_000 });
  52 | 
  53 |   await page.waitForTimeout(2_000);
  54 |   await page.screenshot({ path: "logout-3-after.png", fullPage: true });
  55 | 
  56 |   const stillOnProfile = await page
  57 |     .getByText(/cerrar sesi[oó]n/i)
  58 |     .first()
  59 |     .isVisible()
  60 |     .catch(() => false);
  61 |   expect(stillOnProfile, "should have navigated away from the profile screen").toBe(false);
  62 | 
  63 |   const welcomeVisible = await page
  64 |     .getByText(/comenzar|empezar|welcome|continuar|crear cuenta|iniciar sesi[oó]n/i)
  65 |     .first()
  66 |     .isVisible({ timeout: 5_000 })
  67 |     .catch(() => false);
  68 |   expect(welcomeVisible, "welcome screen should be visible after logout").toBe(true);
  69 | });
```