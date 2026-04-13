# APP FIT (Bioma)

A full-stack fitness and nutrition tracking application with AI-powered meal analysis. Built with React Native (Expo) for the mobile frontend and Node.js + Express for the backend.

## Project Overview

**Bioma** is a mobile-first fitness app that helps users track meals, analyze nutrition intake, and maintain healthy habits. Key features include:

- **AI-Powered Meal Analysis**: Take photos or describe meals in text; Gemini AI analyzes nutritional content (calories, protein, carbs, fat, ingredients)
- **Circadian Rhythm Tracking**: Uses location data to align habits with local sunrise/sunset times
- **Onboarding Flow**: Multi-step user onboarding (goal setting, body metrics, workout frequency, etc.)
- **Wearable Integration**: Mock health provider integration for steps, sleep, and recovery metrics
- **Dark/Light Mode**: Full theme support with fitness-oriented UI components
- **Supabase Storage**: Signed URL uploads for meal photos
- **User Authentication**: Email/password and Google login support

## Architecture

### Backend (`/Backend`)

- **Runtime**: Node.js 22+ with TypeScript (ESM)
- **Framework**: Express.js v5
- **Database**: PostgreSQL via Prisma ORM
- **AI**: Google Gemini 2.5 Flash Lite for meal image/text analysis
- **Storage**: Supabase Storage for meal images (signed URL uploads)
- **Authentication**: Custom email/password + Google OAuth (via `AuthService`)

**Key Backend Structure:**

```
Backend/
├── src/
│   ├── config/          # Environment configuration
│   ├── contracts/       # Zod validation schemas for requests
│   ├── functions/       # Serverless function handlers
│   ├── lib/             # Utilities (Prisma client, error handling)
│   ├── repositories/    # Data access layer (User, Log, Onboarding)
│   ├── services/        # Business logic (Auth, NutritionAnalysis, SupabaseStorage)
│   └── server.ts        # Express app entry point
├── prisma/
│   └── schema.prisma    # Database schema (User, Log, OnboardingSession)
└── .env.example         # Environment variables template
```

### Frontend (`/frontend`)

- **Framework**: React Native with Expo SDK 54
- **Language**: TypeScript
- **UI**: Custom fitness-themed components with dark/light mode support
- **Fonts**: Inter + Manrope (Google Fonts via Expo)
- **Native Features**: Camera, Image Picker, Location, Linear Gradient

**Key Frontend Structure:**

```
frontend/
├── src/
│   ├── components/      # UI components (fitness-ui, onboarding screens, etc.)
│   ├── config/          # Environment configuration
│   ├── services/        # API client, circadian engine, recovery engine, wearables
│   └── types/           # TypeScript type definitions
├── App.tsx              # Main application component (~6000 lines)
├── app.json             # Expo configuration
└── .env                 # Environment variables
```

## Database Schema

**Models:**

- `User` — User accounts with email, fullName, passwordHash, authProvider
- `OnboardingSession` — Multi-step onboarding data (goal, weight, height, gender, age, country, workout frequency, activity level)
- `Log` — Meal analysis logs with AI-derived nutrition data (calories, protein, carbs, fat, fiber, sugar, sodium), ingredients, warnings, and confidence level

## Building and Running

### Prerequisites

- Node.js >= 22
- PostgreSQL database (Supabase recommended)
- Gemini API key
- Supabase project with Storage bucket

### Backend Setup

```bash
cd Backend

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your DATABASE_URL, GEMINI_API_KEY, SUPABASE_URL, etc.

# Generate Prisma client
npm run prisma:generate

# Run database migrations
npm run prisma:migrate:dev

# Start development server (watch mode)
npm run dev

# Or build and start for production
npm run build
npm run start
```

The backend runs on `http://localhost:3000` by default.

### Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Update .env if needed (API base URL should point to your local machine's IP)
# EXPO_PUBLIC_API_BASE_URL="http://YOUR_LOCAL_IP:3000"

# Start Expo
npm start

# Or target a specific platform
npm run android
npm run ios
npm run web
```

> **Note**: When testing on a physical device or emulator, use your local machine's IP address (not `localhost`) in `EXPO_PUBLIC_API_BASE_URL`.

## Key API Endpoints

| Method   | Endpoint                   | Description                          |
| -------- | -------------------------- | ------------------------------------ |
| `GET`    | `/health`                  | Health check                         |
| `POST`   | `/users/bootstrap`         | Bootstrap/create a user              |
| `POST`   | `/auth/register`           | Register with email/password         |
| `POST`   | `/auth/login`              | Login with email/password            |
| `POST`   | `/auth/google`             | Login with Google                    |
| `POST`   | `/onboarding/step/:1-7`    | Save onboarding step data            |
| `GET`    | `/onboarding/session`      | Get onboarding session               |
| `DELETE` | `/onboarding/session`      | Delete onboarding session            |
| `POST`   | `/uploads/meal-image-url`  | Get signed URL for meal image upload |
| `POST`   | `/logs/analyze-meal-image` | Analyze meal from photo (Gemini AI)  |
| `POST`   | `/logs/analyze-meal-text`  | Analyze meal from text description   |
| `POST`   | `/logs/suggest-meal`       | Get AI meal suggestion/alternative   |
| `GET`    | `/logs?userId=...`         | Get user's meal logs                 |

## Environment Variables

### Backend (`.env`)

```bash
DATABASE_URL=postgresql://...
GEMINI_API_KEY=your_api_key
GEMINI_MODEL=gemini-2.5-flash-lite
SUPABASE_URL=https://[project-ref].supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
SUPABASE_STORAGE_BUCKET=meal-images
STORAGE_SIGNED_UPLOAD_TTL_SECONDS=7200
PORT=3000
```

### Frontend (`.env`)

```bash
EXPO_PUBLIC_API_BASE_URL="http://YOUR_IP:3000"
EXPO_PUBLIC_DEFAULT_EMAIL="demo@bioma.app"
EXPO_PUBLIC_DEFAULT_NAME="Valentina"
```

## Development Conventions

- **Backend**: TypeScript with ESM modules (`"type": "module"`). Zod for request validation. Repository pattern for data access. Services for business logic.
- **Frontend**: TypeScript with React functional components. Animated API for animations. Custom design system in `src/components/fitness-ui`.
- **Validation**: All API requests validated with Zod schemas in `contracts/`.
- **Error Handling**: Custom `AppError` class with structured error responses.
- **Language**: UI and API messages are in **Spanish** (targeting Latin American/Spanish market).

## Tech Stack Summary

| Layer    | Technology                               |
| -------- | ---------------------------------------- |
| Frontend | React Native, Expo 54, TypeScript        |
| Backend  | Node.js 22+, Express 5, TypeScript (ESM) |
| Database | PostgreSQL via Prisma                    |
| AI       | Google Gemini 2.5 Flash Lite             |
| Storage  | Supabase Storage (signed URLs)           |
| Fonts    | Inter, Manrope                           |
| Auth     | Email/Password + Google OAuth            |
