# GEMINI.md

> A focused companion to `QWEN.md`. Use this file when you need a quick
> orientation, a TL;DR of the architecture, or pointers to where
> specific concerns live. For detailed setup instructions see `QWEN.md`;
> for agent guidance see `AGENTS.md`.

## TL;DR

Bioma is a **nutrition + wellness coach** mobile app. Users scan their
meals (photo, text or restaurant menu), get calorie/macro estimates from
Google Gemini, see a personalised daily plan derived from their
onboarding profile, and (optionally) track weight + hydration +
workouts. The app ships with email auth, Google OAuth, GDPR data
export / deletion, and a Spanish-language UI built in React Native +
Expo SDK 54.

## Repository map

```
fit-app/
├── AGENTS.md                   ← agent/AI guidance (read first!)
├── QWEN.md                     ← full setup walkthrough
├── GEMINI.md                   ← this file (orientation)
├── RUNBOOK.md                  ← on-call playbooks
├── INFRASTRUCTURE_AND_SECURITY_PLAN.md
├── Dockerfile                  ← backend image (with HEALTHCHECK)
├── render.yaml                 ← Render.com service manifest
├── .github/workflows/          ← ci.yml, deploy.yml
├── CHANGELOG.md                ← unreleased / 0.1.0 changelog
├── Backend/                     ← Express 5 + TS + Prisma + Gemini
│   ├── prisma/
│   │   ├── schema.prisma        ← 11 models, 12 enums
│   │   └── migrations/          ← 4 migrations (initial, refresh-tokens,
│   │                              auth-plan-metrics, hydration, workouts)
│   ├── src/
│   │   ├── server.ts            ← routes + bootstrap (one file)
│   │   ├── config/env.ts        ← Zod-validated env
│   │   ├── contracts/           ← Zod schemas per endpoint
│   │   ├── lib/                 ← logger, app-error, jwt, prisma
│   │   ├── middleware/          ← requireAuth
│   │   ├── repositories/        ← thin DB accessors
│   │   ├── services/            ← business logic (auth, nutrition,
│   │   │                          tips, plan, body-metrics, hydration,
│   │   │                          workout, account-deletion, data-export)
│   │   └── server.ts            ← wire-up
│   ├── tests/                   ← Jest (58 tests across 8 suites)
│   └── package.json
└── frontend/                   ← Expo SDK 54 + RN + TS
    ├── App.tsx                  ← single-file composition root
    ├── app.json                 ← Expo config (scheme + deep links)
    ├── eas.json                 ← Expo Application Services
    ├── e2e/                     ← Playwright smoke
    ├── src/
    │   ├── App.tsx              ← orchestration (~6,100 lines)
    │   ├── components/
    │   │   ├── auth-flow/       ← forgot/reset/verify screens
    │   │   ├── onboarding/      ← 7 onboarding screens
    │   │   ├── fitness-ui.tsx   ← design tokens + layout primitives
    │   │   ├── home-screen.tsx  ← hero + metrics + history preview
    │   │   ├── meal-history-screen.tsx
    │   │   ├── profile-screen.tsx
    │   │   ├── weight-history-screen.tsx
    │   │   ├── workout-history-screen.tsx
    │   │   ├── account-settings-modal.tsx ← GDPR export/delete
    │   │   ├── edit-profile-modal.tsx      ← weight/height/age editor
    │   │   └── …
    │   ├── hooks/               ← use-onboarding-gate,
    │   │                          use-onboarding-completion
    │   ├── services/            ← bioma-api, auth-token-manager,
    │   │                          bioma-storage, circadian/recovery
    │   │                          engines, mock wearable provider
    │   ├── store/               ← zustand (water, persisted via API)
    │   ├── types/               ← shared API/UI types
    │   ├── utils/               ← image-utils (compress for upload)
    │   └── config/               ← env reader
    └── package.json
```

## Architectural principles

- **Backend in ESM** with `.js` import extensions (compiled by tsc).
  Always test locally with `npm run dev` (tsx) before `npm run build`.
- **Repositories** are thin; **services** hold business logic; **contracts**
  own Zod validation. Routes never speak to Prisma directly.
- **AppError** is the single error contract. Services throw it; the
  global `handleError` translates to JSON responses.
- **PII safety**: a structured logger scrubs emails, tokens and image
  paths before they reach stdout. Never `console.log` user input.
- **SOLID** is a target, not a guarantee. The Sprint S0/S1/S2 audits
  call out the spots that still lean on string-matching or `as never`
  casts. Touching a file? Keep the new code clean.

## Domain model at a glance

```
User ─┬─< OnboardingSession
      ├─< UserProfile ─< NutritionPlan (1:1)
      ├─< Log (meal analysis)
      ├─< BodyMetric (weight/waist/hip/chest/body-fat)
      ├─< HydrationLog (per-event glasses)
      ├─< Workout ─< WorkoutSet
      ├─< Tip (weekly)
      ├─< RefreshToken
      └─< EmailToken (PASSWORD_RESET | EMAIL_VERIFICATION)
```

## API surface (high-level)

| Concern | Endpoints |
|---|---|
| Auth | `POST /auth/{register,login,google,logout,forgot-password,reset-password,verify-email,resend-verification}`, `POST /auth/refresh` |
| Onboarding | `POST /onboarding/step/{1..7}`, `GET /onboarding/session`, `DELETE /onboarding/session` |
| Me | `GET /me/profile`, `PATCH /me/profile`, `GET /me/plan`, `POST /me/plan/recompute` |
| GDPR | `GET /me/data-export`, `DELETE /me/account` |
| Meal capture | `POST /uploads/meal-image-url`, `POST /logs/analyze-meal-image`, `POST /logs/analyze-meal-text`, `POST /logs/analyze-menu-image`, `GET /logs`, `POST /logs/suggest-meal` |
| Tips | `POST /tips/generate`, `GET /tips` |
| Body metrics | `POST /body-metrics`, `GET /body-metrics`, `DELETE /body-metrics/:id` |
| Hydration | `POST /hydration`, `GET /hydration/today`, `GET /hydration`, `DELETE /hydration/:id` |
| Workouts | `POST /workouts`, `GET /workouts`, `GET /workouts/:id`, `DELETE /workouts/:id` |

## Daily essentials

| What | Where |
|---|---|
| Typecheck backend | `cd Backend && npx tsc --noEmit` |
| Typecheck frontend | `cd frontend && npx tsc --noEmit` |
| Backend tests | `cd Backend && npm test` |
| E2E smoke | `cd frontend && npm run test:e2e:install && npm run test:e2e` |
| Add Prisma column | `cd Backend && DATABASE_URL=... npx prisma migrate dev --name <feature>` |
| Generate client | `cd Backend && npm run prisma:generate` |
| Validate schema | `cd Backend && npx prisma validate` |
| View routes | `cd Backend && npm run dev` (boot log lists every endpoint) |
| Toggle AI mock | `EMAIL_LOG_ONLY=true` in `.env` (forces console transport) |

## Conventions

- **Backend TypeScript**: ESM, strict, `noUncheckedIndexedAccess`. New
  service files end in `.service.ts` and live in `Backend/src/services/`.
- **Frontend TypeScript**: strict, Expo base config. New screens go in
  `frontend/src/components/<feature>/`. Hooks in `frontend/src/hooks/`.
- **Tests**: every new service ships with a Jest suite in
  `Backend/tests/<feature>.test.ts`. Frontend tests are still 0; the
  S3 backlog item is to bootstrap Jest + RN Testing Library.
- **Commit messages**: lowercase, imperative ("add", not "added"). One
  logical change per commit.
- **Spanish UI**: keep user-facing copy in Latin-American Spanish. No
  i18n yet — every string is hard-coded in Spanish.

## Watch-outs

- `User.emailVerified` is required for production password-reset
  flows. Make sure the SMTP path is configured before turning on the
  App Store / Play Store builds.
- Rate limiting is in-memory. Single-instance only. If you scale to
  multiple Render instances, swap in `@upstash/ratelimit` (S3 item).
- Wearable data is mocked. The home screen reads `mockHealthProvider`.
  Replace with a real `AppleHealthProvider`/`HealthConnectProvider`
  before shipping.
- The paywall modal shows "Próximamente" — no Stripe/RevenueCat
  wiring yet (S3 item).
- `WaterCelebration` is mounted always; intended to be a modal triggered
  on milestone increments (small refactor pending).