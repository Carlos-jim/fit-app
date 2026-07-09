# Changelog

All notable changes to Bioma are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/) and the project adheres
to [Semantic Versioning](https://semver.org/) once we tag the first
release.

## [Unreleased]

### Added
- GDPR: `GET /me/data-export` and `DELETE /me/account` with cascade,
  transactional safety and a sanitised JSON export payload.
- `PATCH /me/profile` for editing weight/height/age/country/goal/
  activity level after onboarding. Triggers automatic plan recompute
  when plan-affecting fields change.
- Hydration tracking: `HydrationLog` model, four endpoints
  (`POST/GET-today/GET/DELETE /hydration`), and persistence in the
  `useWaterStore` (optimistic update + rollback).
- Workout tracking: `Workout` + `WorkoutSet` models, four endpoints
  (`POST/GET/GET-id/DELETE /workouts`), and a new `WorkoutHistoryScreen`
  with weekly stats and an inline "log session" modal.
- `AccountSettingsModal` and `EditProfileModal` linked from
  `ProfileScreen` (GDPR export/delete + physical profile editor).
- Structured `ApiError` on the frontend that preserves the backend's
  machine-readable `code` and `details`.
- AppError-based error contract for the auth-email service
  (no more string matching).
- PII-safe logger (`Backend/src/lib/logger.ts`) that scrubs emails,
  tokens and image paths before they hit stdout.
- `useOnboardingGate` + `useOnboardingCompletion` hooks (SRP) so
  login no longer forces re-onboarding and zombie sessions are
  cleaned up automatically.
- `UserProfileMapper` to replace `as never` casts in the user-profile
  repository.
- Image upload via Supabase signed URL on the frontend (no more
  `base64Image` round-trip).
- Docker `HEALTHCHECK` directive on the backend image.
- Jest coverage for `account-deletion`, `data-export`,
  `update-profile`, `hydration`, and `workout` services.
- Playwright smoke E2E covering register/refresh/logout, password
  reset and email verification flows.

### Changed
- App.tsx shrunk from **7.389 → 6.097** lines (−17 %) by deleting
  three dead `render*Screen` functions and removing fake/duplicate
  state (`weightTrend`, `homeStepsGoal` vs `homeStepGoal`,
  `hasSeenPhotoPaywall`).
- Hard-coded UI values (trend chart, daily target, "5.500 pasos",
  "456 - 512 kcal", `OBJETIVO = 2100`, `184/184/70` macros) now read
  from real server-side data.
- `parseResponse` no longer drops `code` / `details` from backend
  errors.
- `biomaApi.logout` now invalidates the server-side session before
  scrubbing local tokens.
- `ci.yml` runs backend Jest and frontend Playwright (best-effort).
- Console-based `console.log` calls migrated to the structured
  logger (`OnboardingRepository`, `user.repository`, `tips.service`,
  `auth.service`, `email.service`, server uploads).

### Fixed
- `/users/bootstrap` requires authentication and refuses to mutate
  another user's profile (was unauthenticated, allowed ownership
  bypass).
- `/logs/analyze-menu-image` validates that the public image URL
  belongs to the requesting user's folder in the Supabase bucket
  (was scope-less).
- `Log.aiSuggestion` writes now require the log to belong to the
  current user (data-leakage fix).
- Login no longer forces onboarding when the profile is already
  complete (was sending existing users through 7 steps again).
- `home-screen.tsx` now receives `currentSteps` from the parent so
  the steps card reflects real wearable data.

### Security
- All console.log PII paths migrated to a scrubbing logger.
- Frontend `console.*` calls in auth/registration/meal flows are now
  gated by `__DEV__`.
- Server invalidates refresh tokens on password reset, on logout,
  and on account deletion (cascade).

## [0.1.0] — Initial MVP

- Email/password + Google OAuth registration and login with JWT
  refresh rotation.
- 7-step onboarding wizard persisting a `UserProfile` and lazily
  generating a Mifflin-St Jeor-based nutrition plan.
- Meal analysis via Gemini for images, text, and restaurant menus
  with signed-URL uploads to Supabase Storage.
- AI healthy-meal suggestion + weekly personalised tips.
- Profile, history, stats, tips and camera tabs in a single Expo
  React Native app.
- Sentry, helmet, rate-limiters, CORS and CSP baseline security.

[Unreleased]: https://example.com/compare/v0.1.0...HEAD
[0.1.0]: https://example.com/releases/tag/v0.1.0