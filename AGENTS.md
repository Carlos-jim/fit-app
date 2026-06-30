# Agent Guidance

## Repository Layout

- `Backend/` — Node.js 22+ Express API (TypeScript, ESM, no workspace tooling)
- `frontend/` — React Native with Expo SDK 54 (TypeScript, strict)
- No monorepo tool; operate from each directory independently

## Backend

- **Entry**: `src/server.ts`
- **Module system**: ESM (`"type": "module"`, `module: "NodeNext"`, `moduleResolution: "NodeNext"`); always use `.js` extensions in imports
- **Env loading**: Node native `--env-file=.env` (no `dotenv` package). Both `dev` and `start` scripts rely on this flag
- **Required setup order**: `npm install` → `npm run prisma:generate` → create `.env` from `.env.example` → `npm run prisma:migrate:dev` → `npm run dev`
- **Build output**: `tsc -p tsconfig.json` compiles `src/` to `dist/`; start with `node --env-file=.env dist/server.js`
- **Prisma binaryTargets**: `native` and `rhel-openssl-3.0.x` (intended for Supabase/RHEL deploys)
- **No tests configured** — there is no `npm test` script

## Frontend

- **Entry**: `index.ts` → `App.tsx`
- **Dev server**: `npm start` (Expo). Platform targets: `npm run android`, `npm run ios`, `npm run web`
- **Typecheck**: `npm run typecheck` (`tsc --noEmit`)
- **No tests configured** — there is no `npm test` script
- **Physical device / emulator requirement**: `EXPO_PUBLIC_API_BASE_URL` must use the **local machine IP address**, not `localhost` (the device/emulator cannot reach the host loopback)
- **Env vars**: all public env keys must be prefixed with `EXPO_PUBLIC_`
- **Language**: UI and API-facing copy is Spanish

## Architecture Notes

- **Image upload flow**: backend generates a signed Supabase Storage URL (`POST /uploads/meal-image-url`); the client uploads directly to Supabase. The backend never receives image bytes.
- **AI analysis**: Google Gemini 2.5 Flash Lite (`GEMINI_MODEL` in `.env`). Image analysis fetches the image from Supabase, converts to a data URL, and sends it to Gemini.
- **Auth**: custom email/password + Google OAuth via `AuthService`. Google token verification is stubbed in `server.ts` (comment notes it should use `google-auth-library` in production).
- **Validation**: all API request bodies validated with Zod schemas in `Backend/src/contracts/`
- **Error handling**: custom `AppError` class with structured JSON responses; unhandled errors return `500` with generic message and log to console

## Environment Variables

### Backend (`.env`)
- `DATABASE_URL` — PostgreSQL connection string (Supabase recommended)
- `GEMINI_API_KEY`, `GEMINI_MODEL`
- `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_STORAGE_BUCKET`
- `PORT` — defaults to 3000
- `RESEND_API_KEY` — optional; when missing, transactional emails are logged
  to stdout (dev mode). Required for production password reset / verification.
- `EMAIL_FROM` — sender address, e.g. `no-reply@bioma.app` (default)
- `EMAIL_LOG_ONLY` — set to `true` to force console transport even with a
  Resend key configured
- `FRONTEND_URL` — used in password-reset and email-verification deep links
  (e.g. `https://bioma.app`)

### Frontend (`.env`)
- `EXPO_PUBLIC_API_BASE_URL` — must be host IP when testing on device/emulator
- `EXPO_PUBLIC_DEFAULT_EMAIL`, `EXPO_PUBLIC_DEFAULT_NAME`
- `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID`, `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID`, `EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID`

## API surface (post-tasks 1-5)

| Method | Path                            | Auth | Notes                                            |
| ------ | ------------------------------- | ---- | ------------------------------------------------ |
| POST   | `/auth/forgot-password`         | no   | Always returns 200 (no email enumeration)        |
| POST   | `/auth/reset-password`          | no   | 1h TTL, rotates all refresh tokens on success    |
| POST   | `/auth/verify-email`            | no   | 24h TTL                                          |
| POST   | `/auth/resend-verification`     | no   | No-op if already verified                        |
| GET    | `/me/profile`                   | JWT  | Returns profile + onboarding + `onboardingComplete` flag |
| GET    | `/me/plan`                      | JWT  | Lazy-creates a plan from profile (Mifflin-St Jeor) |
| POST   | `/me/plan/recompute`            | JWT  | Recompute after onboarding/profile change         |
| POST   | `/body-metrics`                 | JWT  | Records weight / waist / hip / chest / body fat  |
| GET    | `/body-metrics?type=...&from=...&to=...&limit=...` | JWT | List scoped to user   |
| DELETE | `/body-metrics/:id`             | JWT  | Idempotent 404 if not owned by user              |

All new tables: `NutritionPlan`, `BodyMetric`, `EmailToken`. Migrations live
under `Backend/prisma/migrations/20260629000000_auth_plan_metrics/`.

## Testing

- Backend: `cd Backend && npm test` (Jest, 33 tests across `nutrition-plan`,
  `body-metrics`, and `auth` — no DB required, mocks Prisma and the email
  transport).
- Frontend E2E: `cd frontend && npm run test:e2e:install && npm run test:e2e`
  (Playwright smoke against `E2E_BASE_URL`, default `http://localhost:3000`).
  Tests auto-skip when the backend is unreachable so CI without a DB still passes.

## Existing Instruction Files

- `QWEN.md` — comprehensive project overview and setup guide (human-oriented)
- `GEMINI.md` — currently empty
- `Backend/README.md` — Spanish-language backend quickstart

## Style & Conventions

- Backend: repository pattern (`repositories/`) + service layer (`services/`). Keep business logic out of route handlers.
- Frontend: single large `App.tsx` (~6000 lines). Custom design system lives in `src/components/fitness-ui/`.
