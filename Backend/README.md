# Bioma Backend

Backend en Node.js + TypeScript con Express, Prisma, Gemini y Supabase Storage.

## Arquitectura

- `Expo` en frontend
- `Express` como API HTTP
- `Prisma` para la base de datos PostgreSQL
- `Supabase Postgres` como base recomendada para `DATABASE_URL`
- `Supabase Storage` para fotos de comidas
- `Gemini` para analisis de texto e imagen

## Endpoints

1. `POST /users/bootstrap`
2. `POST /uploads/meal-image-url`
3. `PUT` directo a Supabase Storage con URL firmada
4. `POST /logs/analyze-meal-image`
5. `POST /logs/analyze-meal-text`
6. `GET /logs?userId=...`
7. `GET /health`

## Ejemplos

```json
{
  "email": "demo@bioma.app",
  "fullName": "Bioma Demo"
}
```

```json
{
  "userId": "ck_user_123",
  "fileName": "almuerzo.jpg",
  "contentType": "image/jpeg"
}
```

```json
{
  "userId": "ck_user_123",
  "path": "uploads/meals/ck_user_123/2026-04-05-uuid.jpg",
  "bucket": "meal-images",
  "mealLabel": "Almuerzo",
  "notes": "Arepa con queso y dos huevos",
  "consumedAt": "2026-04-05T12:30:00.000Z"
}
```

```json
{
  "userId": "ck_user_123",
  "mealLabel": "Desayuno",
  "description": "Me comi una arepa con queso y dos huevos",
  "consumedAt": "2026-04-05T08:00:00.000Z"
}
```

## Variables de entorno

Usa `.env.example` como base.

```bash
DATABASE_URL=postgresql://postgres:[password]@db.[project-ref].supabase.co:5432/postgres?schema=public
GEMINI_API_KEY=tu_api_key
GEMINI_MODEL=gemini-2.5-flash-lite
SUPABASE_URL=https://[project-ref].supabase.co
SUPABASE_SERVICE_ROLE_KEY=tu_service_role_key
SUPABASE_STORAGE_BUCKET=meal-images
STORAGE_SIGNED_UPLOAD_TTL_SECONDS=7200
PORT=3000
```

## Comandos

```bash
npm install
npm run prisma:generate
npm run prisma:validate
npm run dev
npm run build
npm run start
```

## Desarrollo local

Para levantar la API local:

```bash
npm run dev
```

La API queda en:

```bash
http://localhost:3000
```

Para el frontend usa una URL accesible desde el dispositivo:

```bash
EXPO_PUBLIC_API_BASE_URL=http://TU_IP_LOCAL:3000
```

Si pruebas desde telefono fisico o emulador, evita `localhost` y usa la IP local de tu PC.

## Notas

- Prisma sigue siendo la capa de acceso a datos. La migracion a Supabase no cambia tu flujo de Prisma ni tus modelos.
- El storage usa URLs firmadas de Supabase para subir fotos desde la app sin pasar el binario por el backend.
- Para mostrar previews de fotos en el historial, conviene que el bucket de comidas sea publico en Supabase Storage.
- El analisis de foto y texto usa Gemini con salida JSON estructurada validada por Zod en backend.
