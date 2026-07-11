// Set required env vars BEFORE any module imports config/env.
process.env.NODE_ENV = "test";
process.env.DATABASE_URL = "postgresql://test:test@localhost:5432/test";
process.env.LLM_PROVIDER = "gemini";
process.env.GEMINI_API_KEY = "test-key";
// Pick a primary model distinct from the secondary fallback so the
// fallback path is reachable in tests.
process.env.GEMINI_MODEL = "gemini-2.5-flash";
process.env.SUPABASE_URL = "https://test.supabase.co";
process.env.SUPABASE_SERVICE_ROLE_KEY = "test-key";
process.env.SUPABASE_STORAGE_BUCKET = "test-bucket";
process.env.JWT_ACCESS_SECRET = "test-access-secret-with-at-least-32-chars";
process.env.JWT_REFRESH_SECRET = "test-refresh-secret-with-at-least-32-chars";
process.env.EMAIL_LOG_ONLY = "true";
process.env.EMAIL_FROM = "Bioma Test <test@bioma.app>";
process.env.FRONTEND_URL = "https://test.bioma.app";
process.env.RESEND_API_KEY = "";
