# Plan de Infraestructura y Seguridad — Bioma App

> Estado: planificación técnica pre-lanzamiento  
> Presupuesto: gratuito inicial, luego ~USD 50/mes  
> Usuarios iniciales estimados: 20  
> Plataforma: solo móvil (iOS/Android vía Expo)  
> GDPR: posiblemente aplica  

---

## 1. Arquitectura actual (resumen)

| Capa | Tecnología actual |
|---|---|
| Frontend | React Native + Expo SDK 54 |
| Backend | Node.js 22 + Express + TypeScript ESM |
| ORM / DB | Prisma + Neon Serverless Postgres |
| Storage | Supabase Storage |
| IA | Google Gemini 2.5 Flash Lite |
| Auth | Email/password propio + Google OAuth (stub) |

### Flujos clave
- La app escanea comidas → backend analiza con Gemini → guarda en Postgres.
- Las imágenes suben directamente a Supabase Storage vía URL firmada.
- No hay tests ni CI/CD configurados.

---

## 2. Hallazgos críticos de seguridad (auditoría previa)

> Estos items deben resolverse **antes** de publicar en tiendas.

### 🔴 Críticos

1. **No hay autenticación real en la API**
   - Los endpoints reciben `userId` en body/query sin validar sesión.
   - Cualquier usuario puede leer/escribir datos de otro.
   - Archivo: `Backend/src/server.ts`.

2. **CORS completamente abierto**
   - `cors()` sin whitelist permite llamadas desde cualquier sitio web.
   - Archivo: `Backend/src/server.ts:48`.

3. **Google OAuth con fallback inseguro**
   - Si `GOOGLE_CLIENT_IDS` está vacío, se acepta cualquier `idToken` y se accede a una cuenta placeholder compartida.
   - Archivo: `Backend/src/services/auth.service.ts:82-112`.

4. **Secrets en `.env` sin cifrar y versionables**
   - `Backend/.env` contiene URL de Postgres con contraseña, Gemini API key, Supabase service-role key, contraseña de Supabase en texto plano.
   - `frontend/.env` está trackeado en Git.

5. **Logs exponen datos sensibles**
   - El frontend loguea request bodies (contraseñas, imágenes base64).
   - El backend loguea URLs firmadas, paths de imágenes y emails.

6. **Sin rate limiting**
   - Login, registro y endpoints de IA son vulnerables a fuerza bruta y abuso.

7. **Sin headers de seguridad**
   - No hay `helmet`, HSTS ni HTTPS forzado.

### 🟡 Altos / Medios

8. Política de contraseñas débil (mínimo 6 caracteres).
9. El frontend hace `trim()` a las contraseñas.
10. `/auth/logout` no hace nada; no hay refresh tokens.
11. AsyncStorage no está cifrada (no se usa para credenciales hoy, pero es el wrapper de persistencia).
12. Posible prompt injection en Gemini por concatenación directa de input del usuario.
13. Error responses pueden filtrar información interna (`AppError` expone `cause`).
14. `/logs/analyze-menu-image` acepta URLs externas arbitrarias.

---

## 3. Stack de infraestructura recomendado

Criterios: económico, bueno, escalable hasta ~1.000 usuarios, compatible con GDPR.

| Servicio | Opción recomendada | Costo estimado inicial | Costo a ~50 USD/mes |
|---|---|---|---|
| **Backend** | Railway / Render / Fly.io | Gratis (sleep/horas limitadas) | USD 5-19/mes |
| **Base de datos** | Neon Postgres (ya en uso) | Gratis (10k filas, 0.5 GB) | USD 19/mes (Pro) |
| **Storage imágenes** | Supabase Storage (ya en uso) | Gratis (1 GB) | USD 5-25/mes |
| **Dominio** | Cloudflare Registrar / Namecheap | ~USD 10-15/año | ~USD 10-15/año |
| **DNS + CDN + WAF** | Cloudflare (plan gratis) | Gratis | Gratis |
| **SSL** | Cloudflare / Let's Encrypt | Gratis | Gratis |
| **Monitoreo errores** | Sentry (plan gratis) | Gratis | Gratis |
| **Uptime** | UptimeRobot (plan gratis) | Gratis | Gratis |
| **Auth** | Implementación propia con JWT + refresh tokens | Gratis | Gratis |
| **Logs** | Host nativo + opcionalmente Better Stack (gratis) | Gratis | Gratis |

### Recomendación concreta

- **Backend**: **Railway** o **Render**. Ambos tienen buen free tier y deploy sencillo desde GitHub. Railway es más simple; Render más transparente en precios.
- **Dominio**: comprar en **Cloudflare Registrar** (sin markup) y apuntar DNS a Cloudflare.
- **Protección**: Cloudflare proxy + reglas de firewall básicas.
- **DB**: quedarse en Neon; activar backups automáticos en el plan Pro cuando sea posible.
- **Storage**: quedarse en Supabase; configurar RLS y buckets privados.

---

## 4. Roadmap por fases

### Fase 1 — Seguridad bloqueante (antes del deploy)

> Objetivo: que la API no sea un riesgo evidente para usuarios reales.
> **Estado:** implementado. Falta aplicar la migración de base de datos cuando Neon esté disponible.

- [x] Implementar autenticación JWT
  - [x] `POST /auth/register` devuelve tokens (access + refresh).
  - [x] `POST /auth/login` devuelve tokens.
  - [x] `POST /auth/refresh` renueva access token.
  - [x] `POST /auth/logout` invalida refresh token.
  - [x] Middleware `requireAuth` en rutas protegidas.
  - [x] Reemplazar `userId` en body/query por `req.user.id`.
- [x] Autorización por recurso
  - [x] Cada endpoint protegido usa `req.user.id`; no acepta `userId` externo.
- [x] CORS restringido
  - [x] Configurable vía `CORS_ORIGIN`.
- [x] Rate limiting
  - [x] General: 100 req/15 min por IP.
  - [x] Auth: 10 intentos/hora por IP.
  - [x] IA: 30 análisis/hora por usuario.
- [x] Helmet
  - [x] Agregar `helmet()`.
- [x] Google OAuth real
  - [x] Verificar `idToken` con `google-auth-library`.
  - [x] Eliminar el fallback placeholder.
- [x] Sanitizar logs
  - [x] No se loguean passwords, tokens, imágenes base64 ni URLs firmadas.
- [x] Política de contraseñas
  - [x] Mínimo 8 caracteres, 1 mayúscula, 1 minúscula, 1 número.
  - [x] Eliminar `trim()` de contraseñas en frontend.
- [x] Manejo de errores seguro
  - [x] En producción, no se expone `cause` ni stack traces al cliente.
- [x] Frontend maneja tokens
  - [x] Almacenamiento seguro con `expo-secure-store`.
  - [x] Interceptor de refresh automático.
  - [x] Logout borra tokens.
- [ ] Migración de base de datos
  - [ ] Ejecutar `npm run prisma:migrate:dev` cuando Neon esté disponible.
  - [ ] Archivo de migración creado en `prisma/migrations/add_refresh_tokens/migration.sql`.
- [ ] Secrets
  - [ ] Rotar todas las API keys/contraseñas expuestas.
  - [ ] Mover secrets a variables de entorno del host (no versionar `.env`).
  - [x] Quitar `frontend/.env` del repositorio (`git rm --cached`).

### Fase 2 — Infraestructura de producción

> Objetivo: tener un deploy estable, observable y recuperable.
> **Estado:** parcialmente implementado. Los archivos de configuración están creados; faltan pasos manuales de cuentas/dominio.

- [x] Elegir host de backend: **Render**
- [x] Crear `Dockerfile` en raíz para deploy de `Backend/` en Render
- [x] Crear `.dockerignore` para reducir tamaño de build
- [x] Agregar endpoint `/health` con check de base de datos (`Backend/src/server.ts`)
- [x] Configurar CI/CD con GitHub Actions (`.github/workflows/ci.yml`)
- [x] Integrar Sentry en backend (`@sentry/node`) y frontend (`@sentry/react-native`)
- [x] Validar uploads en backend: tipos MIME, extensión, tamaño máximo 10 MB
- [x] Preparar políticas RLS para Supabase Storage (`Backend/infrastructure/supabase-storage-rls.sql`)
- [x] Actualizar `.env.example` de backend y frontend
- [x] Preparar guía de DNS/Cloudflare (`Backend/infrastructure/CLOUDFLARE_SETUP.md`)
- [ ] Comprar dominio (opcional para MVP; se puede usar `bioma-api.onrender.com` gratis)
  - Puede ser en Namecheap, Porkbun, GoDaddy, Google Domains o Cloudflare Registrar.
- [ ] Configurar Cloudflare (opcional para MVP)
  - [ ] DNS apuntando al backend.
  - [ ] Proxy de Cloudflare activado.
  - [ ] Regla de firewall: bloquear países innecesarios (opcional).
  - [ ] Page rule: forzar HTTPS.
- [ ] Deploy del backend en Render
  - [ ] Conectar repositorio de GitHub.
  - [ ] Configurar variables de entorno en el dashboard de Render.
  - [ ] Verificar `/health` en el dominio de Render.
- [ ] Neon
  - [ ] Confirmar uso de connection pooler (`-pooler`).
  - [ ] Configurar IP allow list.
  - [ ] Habilitar backups automáticos.
- [ ] Supabase Storage
  - [ ] Aplicar políticas RLS en SQL Editor.
  - [ ] Verificar bucket privado.
- [ ] CI/CD avanzado
  - [ ] Crear rama `develop` para staging.
  - [ ] Deploy automático a staging desde `develop`.
  - [ ] Deploy a producción solo con manual trigger.
- [ ] Monitoreo
  - [ ] Crear proyecto Sentry y copiar DSN a variables de entorno.
  - [ ] Configurar UptimeRobot ping cada 5 minutos.
  - [ ] Logs centralizados (del propio host inicialmente).

### Fase 3 — Hardering y GDPR

> Objetivo: reducir superficie de ataque y cumplir regulaciones básicas.

- [ ] Seguridad adicional
  - [ ] bcrypt/Argon2 para hashes (verificar configuración actual).
  - [ ] Validación estricta de uploads.
  - [ ] Prompt injection mitigation (delimitadores + validación de output).
  - [ ] Sanitizar `imageUrl` en `/logs/analyze-menu-image`.
  - [ ] Auditoría de dependencias (`npm audit --audit-level high`).
- [ ] GDPR
  - [ ] Política de privacidad clara (qué datos, por qué, cuánto tiempo).
  - [ ] Términos de servicio.
  - [ ] Consentimiento explícito al registrarse.
  - [ ] Endpoint de exportación de datos personales.
  - [ ] Endpoint de eliminación de cuenta y datos (derecho al olvido).
  - [ ] Registro de actividad de procesamiento.
  - [ ] Cookies/tracking: documentar uso de analytics.
- [ ] App stores
  - [ ] Privacy labels de iOS y Android.
  - [ ] Descripción de permisos justificada.

### Fase 4 — Pre-lanzamiento

- [ ] Penetration testing básico manual.
- [ ] Revisión de permisos de la app móvil.
- [ ] Plan de respuesta a incidentes (contacto, rollback, rotación de secrets).
- [ ] Documentar runbook de deploy y rollback.
- [ ] Test de carga mínimo (k6 o Artillery gratis).

---

## 5. Checklist de tareas detalladas

### Autenticación y autorización

- [ ] Crear tabla/colección `RefreshToken` en Prisma.
- [ ] Generar access token (15-30 min) y refresh token (7-30 días).
- [ ] Guardar refresh token hasheado en DB.
- [ ] Middleware `authenticateRequest` que valide JWT y adjunte `req.user`.
- [ ] Helper `authorizeResource(userId, resourceUserId)`.
- [ ] Actualizar todos los endpoints para usar `req.user.id`.
- [ ] Frontend: guardar tokens en almacenamiento seguro (Keychain/Keystore vía `expo-secure-store`).
- [ ] Frontend: interceptor para refrescar token automáticamente.
- [ ] Frontend: logout que borre tokens local y en backend.

### Rate limiting

- [ ] Instalar `express-rate-limit`.
- [ ] Configurar limitador global.
- [ ] Configurar limitador estricto para `/auth/*`.
- [ ] Configurar limitador por usuario para endpoints de IA.

### Headers y HTTPS

- [ ] Instalar `helmet`.
- [ ] Configurar `Content-Security-Policy` básica.
- [ ] Forzar HTTPS en producción.
- [ ] Configurar HSTS.

### Secrets

- [ ] Rotar `GEMINI_API_KEY`.
- [ ] Rotar `SUPABASE_SERVICE_ROLE_KEY`.
- [ ] Rotar contraseña de Postgres y actualizar `DATABASE_URL`.
- [ ] Eliminar `PASSOWORD_SUPABSE` del `.env`.
- [ ] Crear `.env.example` limpio sin valores reales.
- [ ] Agregar `.env` a `.gitignore` en frontend.
- [ ] Ejecutar `git rm --cached frontend/.env`.

### Logs

- [ ] Revisar todos los `console.log` en backend.
- [ ] Crear logger que omita `password`, `token`, `imageBase64`, `imageUrl` firmadas.
- [ ] Revisar logs del frontend (`bioma-api.ts`) y eliminar log de `bodyData`.

### Base de datos

- [ ] Confirmar `DATABASE_URL` usa `-pooler`.
- [ ] Revisar índices en tablas frecuentes (`Log.userId + createdAt`, `Tip.userId + weekYear`).
- [ ] Plan de backups: Neon Pro incluye backups diarios por 7 días.

### Storage

- [ ] Bucket privado en Supabase.
- [ ] Política RLS: `bucket_id = 'fit_bucket' AND (storage.foldername(name))[1] = auth.uid()`.
- [ ] Validar en backend: solo imágenes, máximo 10 MB.

### Dominio y DNS

- [ ] Comprar dominio (ej. `bioma.app` o similar).
- [ ] Agregar dominio en Cloudflare.
- [ ] Configurar registro A/CNAME al backend.
- [ ] Activar proxy de Cloudflare.
- [ ] Forzar HTTPS.

### Monitoreo

- [ ] Crear proyecto Sentry (backend + frontend).
- [ ] Configurar UptimeRobot.
- [ ] Habilitar alertas por email/Discord/Slack.

---

## 6. Costos estimados

| Concepto | Inicial | A ~50 USD/mes |
|---|---|---|
| Backend (Railway Starter / Render Starter) | Gratis | USD 5-19 |
| Neon Postgres (Free → Pro) | Gratis | USD 19 |
| Supabase Storage (Free → Pro) | Gratis | USD 5-25 |
| Dominio | USD 10-15/año | USD 10-15/año |
| Cloudflare | Gratis | Gratis |
| Sentry | Gratis | Gratis |
| UptimeRobot | Gratis | Gratis |
| **Total mensual** | **~USD 0** | **~USD 45-65** |

> El free tier de Railway/Render suele tener límites (horas de actividad, CPU/memoria). Con 20 usuarios iniciales sobra, pero para producción estable conviene pasar al plan de pago lo antes posible.

---

## 7. Decisiones pendientes

Antes de empezar a implementar, confirmar:

1. ¿Se elige **Railway**, **Render** u **Fly.io** para el backend?
2. ¿Se compra el dominio en **Cloudflare Registrar** o en otro lugar?
3. ¿Se implementa auth propia con JWT o se evalúa **Supabase Auth** / **Clerk**? (Clerk tiene free tier generoso y ahorra trabajo, pero aumenta vendor lock-in.)
4. ¿Se quiere soporte multi-idioma desde el lanzamiento o solo español?
5. ¿Se necesita analytics (PostHog, Mixpanel, Firebase Analytics)?
6. ¿Se quiere notificaciones push desde el lanzamiento?

---

## 8. Próximos pasos sugeridos

1. Elegir host de backend y dominio.
2. Implementar autenticación JWT (Fase 1).
3. Restringir CORS y agregar rate limiting.
4. Rotar todos los secrets expuestos.
5. Hacer deploy de staging.
6. Resolver GDPR básico antes de publicar en tiendas.

---

## 9. Notas

- Este documento debe actualizarse a medida que se tomen decisiones.
- La fase 1 es **no negociable** antes de publicar la app.
- El plan asume que se mantiene la arquitectura actual. Si más adelante se escala fuerte, se puede evaluar: AWS/GCP, Kubernetes, managed Postgres, CDN propio, etc.
