# Bioma Backend

Backend en Node.js + TypeScript para AWS Lambda, Prisma, S3 y analisis nutricional con OpenAI.

## Flujo implementado

1. `POST /users/bootstrap`
2. `POST /uploads/meal-image-url`
3. `PUT` directo a S3 con URL firmada
4. `POST /logs/analyze-meal-image`
5. `POST /logs/analyze-meal-text`
6. Persistencia del resultado en `Log`

## Requests principales

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
  "s3Key": "uploads/meals/ck_user_123/2026-04-05-uuid.jpg",
  "bucket": "bioma-user-uploads",
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

## Comandos

```bash
npm install
npm run prisma:generate
npm run prisma:validate
npm run build
npm run deploy
```

## Notas

- El flujo movil ya no depende de una imagen cargada manualmente: la app puede pedir URL firmada y subir a S3.
- El `userId` sigue entrando por body para el MVP. En produccion conviene resolverlo con Cognito authorizer.
- El bucket S3 debe permitir `PUT` con `Content-Type` en su CORS si vas a usar cliente web.
