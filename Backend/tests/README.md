# Tests

This repo has two test layers:

## Backend (Jest)

Located in `Backend/tests/`. The suite runs without a database — services are
exercised against mocked Prisma clients and a console email transport.

```bash
cd Backend
npm test           # one-shot run
npm run test:watch # watch mode
```

Coverage:

- `nutrition-plan.test.ts` — `computeTdee` (Mifflin-St Jeor) and `splitMacros`
  with goal-based macro ratios, BMR floor, and calorie coherence checks.
- `body-metrics.test.ts` — repository CRUD + scoping to the owning user,
  plus a regression test for the `Log.saveMealSuggestion` data-leakage fix
  (now requires the user id alongside the log id).
- `auth.test.ts` — `AuthService` register/login/refresh flows with dependency
  injection for `bcrypt`, plus the `AuthEmailService` password-reset and
  email-verification contracts (anti-enumeration, token expiry, transactional
  rotation, no-op for already-verified users).

## Frontend (Playwright)

Located in `frontend/e2e/smoke.spec.ts`. The suite is a **smoke E2E** that
hits a live backend at `E2E_BASE_URL` (defaults to `http://localhost:3000`)
and verifies the public HTTP contract end-to-end.

```bash
cd frontend
npm run test:e2e:install   # downloads Chromium (one-time)
npm run test:e2e           # runs the smoke tests
```

Each test calls `test.skip(true, "...")` if the backend is unreachable, so CI
without a database still passes the suite as a no-op.
