# Bioma Backend

API REST para Bioma: autenticación, onboarding, análisis nutricional
con Gemini, plan calórico, métricas corporales, hidratación y
entrenamientos. Construida con **Node.js 22 + TypeScript + Express 5 +
Prisma 6 + Supabase Storage + Google Gemini + Resend**.

## Arquitectura

- **Express 5** como API HTTP (ESM, strict, `noUncheckedIndexedAccess`).
- **Prisma** como capa de acceso a datos (Postgres).
- **Supabase Storage** para fotos de comidas vía signed URLs.
- **Gemini** (`@google/genai`) para análisis de imagen/texto/menú con
  esquema JSON estructurado y triple-fallback de modelos.
- **Resend** para emails transaccionales (reset password + verify).
- **Sentry** para tracing en producción (init condicional).
- **Jest + supertest** + mocks de Prisma/Gemini/Resend para unit tests.

## Endpoints

### Salud
- `GET /health` — ping DB; 200 / 503 según disponibilidad.

### Auth (`/auth/*`)
- `POST /auth/register` — crea usuario con email+password (envía email
  de verificación).
- `POST /auth/login` — emite access + refresh tokens.
- `POST /auth/google` — OAuth Google via `google-auth-library`.
- `POST /auth/refresh` — rota refresh tokens (replay → 401).
- `POST /auth/logout` — revoca el refresh token.
- `POST /auth/forgot-password` — envía email de reset (1h TTL).
- `POST /auth/reset-password` — completa el reset + rota todas las
  sesiones.
- `POST /auth/verify-email` — confirma el correo.
- `POST /auth/resend-verification` — re-envía el email de confirmación.

### Onboarding
- `POST /onboarding/step/{1..7}` — escribe un campo a la vez.
- `GET /onboarding/session` — recupera la sesión actual.
- `DELETE /onboarding/session` — promueve la sesión a `UserProfile` y
  la elimina.

### Me (`/me/*`)
- `GET /me/profile` — perfil + onboarding + flag `onboardingComplete`.
- `PATCH /me/profile` — partial update (peso/altura/edad/goal/etc.).
  Recalcula el plan si toca campos que lo afectan.
- `GET /me/plan` — plan calórico (lazy-crea desde `UserProfile`).
- `POST /me/plan/recompute` — fuerza recálculo.
- `GET /me/data-export` — exporta todos los datos personales (JSON).
- `DELETE /me/account` — elimina la cuenta con cascade transaccional.

### Captura de comida
- `POST /uploads/meal-image-url` — URL firmada de Supabase Storage.
- `POST /logs/analyze-meal-image` — Gemini analiza una imagen subida
  (path en Storage).
- `POST /logs/analyze-meal-text` — Gemini analiza descripción textual.
- `POST /logs/analyze-menu-image` — Gemini analiza carta de restaurante
  desde URL pública (con validación de ownership).
- `GET /logs` — historial del usuario (top 200).
- `POST /logs/suggest-meal` — alternativa saludable cacheada por `logId`.

### Tips
- `POST /tips/generate` — genera tips semanales (cacheados por
  `weekYear`).
- `GET /tips` — tips de la semana actual.

### Métricas corporales (`/body-metrics`)
- `POST /body-metrics` — registra peso/cintura/cadera/pecho/% grasa.
- `GET /body-metrics?type=&from=&to=&limit=` — listado paginado.
- `DELETE /body-metrics/:id` — idempotente 404 si no es del usuario.

### Hidratación (`/hydration`)
- `POST /hydration` — registra evento (1-N vasos).
- `GET /hydration/today` — total del día.
- `GET /hydration?from=&to=&limit=` — listado.
- `DELETE /hydration/:id` — elimina un evento.

### Workouts (`/workouts`)
- `POST /workouts` — crea workout con ≥1 set (transaccional).
- `GET /workouts?from=&to=&limit=` — listado.
- `GET /workouts/:id` — detalle con sets.
- `DELETE /workouts/:id` — elimina un workout completo.

## Modelos Prisma

11 modelos: `User`, `RefreshToken`, `EmailToken`, `OnboardingSession`,
`UserProfile`, `NutritionPlan`, `Log`, `BodyMetric`, `HydrationLog`,
`Workout`, `WorkoutSet`. 12 enums (LogType, LogSource,
AnalysisConfidence, GoalType, ActivityLevel, WorkoutType, etc.).

Las migraciones viven en `Backend/prisma/migrations/`:

```
20260615001854_new/                 ← inicial (todos los modelos base)
add_refresh_tokens/                 ← RefreshToken
20260629000000_auth_plan_metrics/    ← NutritionPlan, BodyMetric,
                                      EmailToken, emailVerified
20260630000000_hydration/            ← HydrationLog
20260630000001_workouts/             ← Workout, WorkoutSet
```

## Variables de entorno

Copia `.env.example` a `.env`. La validación con Zod falla rápido si
falta algo crítico.

| Variable | Notas |
|---|---|
| `DATABASE_URL` | Pooled connection string de Neon (suffix `-pooler`). |
| `GEMINI_API_KEY`, `GEMINI_MODEL` | Modelo primario; el servicio aplica 2 fallbacks hardcoded. |
| `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_STORAGE_BUCKET` | Storage signed URLs. |
| `STORAGE_SIGNED_UPLOAD_TTL_SECONDS` | Default 7200. |
| `PORT` | Default 3000. |
| `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET` | Mínimo 32 caracteres. |
| `JWT_ACCESS_EXPIRES_IN`, `JWT_REFRESH_EXPIRES_IN` | Default `15m` / `7d`. |
| `GOOGLE_CLIENT_IDS` | CSV de client IDs (web / iOS / Android). |
| `RESEND_API_KEY` | Opcional; sin ella, los emails se imprimen en consola. |
| `EMAIL_FROM` | Default `no-reply@bioma.app`. |
| `EMAIL_LOG_ONLY` | `true` fuerza consola incluso con Resend. |
| `FRONTEND_URL` | Origen para deep links de reset/verify. |
| `CORS_ORIGIN` | CSV de orígenes permitidos (vacío = rechaza todos). |
| `ALLOWED_IMAGE_HOSTS` | Whitelist para `/logs/analyze-menu-image`. |
| `SENTRY_DSN` | Opcional; activa tracing cuando está presente. |

## Comandos

```bash
# Setup
npm install
npm run prisma:generate
npm run prisma:validate
npm run prisma:migrate:dev      # crea/aplica migración en dev

# Desarrollo
npm run dev                      # tsx watch + hot reload
npm run build                    # compila TS → dist/
npm start                        # corre dist/server.js con --env-file

# Tests
npm test                         # Jest (58 tests, 8 suites)
npm run test:watch

# Lint / typecheck
npx tsc --noEmit
```

## Docker

`Dockerfile` (raíz del repo) compila en multi-stage y termina en una
imagen `node:22-slim` no-root con `HEALTHCHECK` apuntando a `/health`.
Render la usa tal cual vía `render.yaml`.

```bash
docker build -t bioma-backend .
docker run -p 3000:3000 --env-file Backend/.env bioma-backend
```

## Despliegue

1. `render.yaml` describe el servicio `bioma-backend` con
   `healthCheckPath: /health`, `autoDeploy: false` (manual vía
   `deploy.yml`), `DATABASE_URL` apuntando a Neon.
2. Las migraciones se aplican en arranque con
   `npx prisma migrate deploy`.
3. CI (`.github/workflows/ci.yml`) corre typecheck + npm test + Playwright
   en cada push.

## Estructura del código

```
src/
├── server.ts                ← wire-up + todas las rutas (un solo archivo)
├── config/env.ts            ← Zod-validated env
├── contracts/               ← un archivo por dominio de Zod
├── lib/
│   ├── app-error.ts         ← clase de error tipada
│   ├── jwt.ts               ← sign/verify access+refresh, hashToken
│   ├── logger.ts            ← logger con scrubbing de PII
│   └── prisma.ts            ← cliente singleton
├── middleware/
│   └── auth.middleware.ts   ← requireAuth, authorizeResource
├── repositories/            ← CRUD simple sobre Prisma
├── services/                ← lógica de negocio
└── server.ts                ← bootstrap
```

### Servicios clave

| Servicio | Responsabilidad |
|---|---|
| `AuthService` | registro, login email/Google, refresh rotation. Inyecta bcrypt para testabilidad. |
| `AuthEmailService` | password reset + email verification. Lanza `AppError` directo. |
| `AccountDeletionService` | cascade delete transaccional. |
| `DataExportService` | JSON export schemaVersion 1 con todo lo del usuario. |
| `NutritionPlanService` | Mifflin-St Jeor + split de macros por goal. |
| `HydrationService` | agregado diario + clamp de fechas futuras. |
| `WorkoutService` | workout + sets transaccional. |
| `NutritionAnalysisService` | Gemini con triple-fallback + retry. |
| `TipsService` | Gemini con fallback mock en 429. |
| `SupabaseStorageService` | signed URLs + descarga validada. |

## Patrones clave

- **Errores tipados**: `AppError(message, { statusCode, code, cause })`.
  El handler global lo serializa a JSON. Nada de `err.message === "..."`.
- **PII nunca en logs**: `logger.child("context").info("msg", data)` —
  el `scrubValue` redactor enmascara emails/tokens/paths antes de
  llegar a stdout.
- **Transacciones para cascade**: cualquier operación que toca varias
  tablas va dentro de `prisma.$transaction(async tx => ...)`.
- **Validación siempre en el borde**: el contrato Zod rechaza el body
  con `INVALID_REQUEST_BODY` antes de tocar la DB.
- **Endpoints con auth primero**: cualquier handler sensible va con
  `requireAuth` antes del handler; `getUserId(req)` extrae el id.

## Próximos pasos (S3 backlog)

- Tests para `NutritionAnalysisService` (mock `@google/genai`).
- Tests para `TipsService` (idem).
- Tests para `SupabaseStorageService` (mock `@supabase/supabase-js`).
- Rate limiter distribuido (Upstash).
- OpenAPI / Swagger spec generado desde los Zod contracts.
- `Dockerfile` ya tiene HEALTHCHECK; añadir stage de tests.