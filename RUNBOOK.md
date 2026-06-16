# Bioma Runbook — Operaciones de Producción

> Última actualización: 15 de junio 2026
> Aplicación: Bioma (backend + app móvil)
> Infraestructura: Render (backend), Neon (DB), Supabase (Storage), Sentry (monitoreo)

---

## 1. Deploy

### Pre-deploy checklist

- [ ] Tests pasan: `npm run build` (backend) y `npm run typecheck` (frontend).
- [ ] No hay secrets en commits: revisar con `git diff`.
- [ ] Migración de DB lista (si hay cambios en schema): `prisma/migrations/` generada.

### Deploy a staging (automático)

```bash
# En local
git checkout develop
# ...hacer cambios...
git commit -m "feat: descripción del cambio"
git push origin develop
```

GitHub Actions (`deploy.yml`) trigger automático a Render staging.

### Deploy a producción (manual)

1. Ir a **GitHub → Actions → Deploy**.
2. Click **Run workflow**.
3. Seleccionar environment: `production`.
4. Verificar en Render dashboard que el deploy termine sin errores.
5. Verificar `/health`:
   ```bash
   curl https://tu-api.onrender.com/health
   # Esperado: {"data":{"ok":true,"database":"connected"}}
   ```

---

## 2. Rollback

### Rollback rápido en Render

1. Ir al **Render Dashboard** → Servicio `bioma-backend`.
2. Click en **Manual Deploy** → seleccionar el commit anterior.
3. El rollback toma ~1 minuto.

### Rollback de base de datos

> ⚠️ Prisma `migrate deploy` es idempotente. Si un deploy falló antes de tocar la DB, no hay rollback necesario.
> Si la migración ya se aplicó y hay que revertir:

1. Crear migración de reversión: `npx prisma migrate dev --create-only`.
2. Revisar SQL generado.
3. Aplicar: `npx prisma migrate deploy`.

---

## 3. Incidentes comunes

### 🔴 La app no responde (503 / timeout)

1. Verificar `/health`:
   ```bash
   curl https://tu-api.onrender.com/health
   ```
   - Si responde `database: disconnected` → problema de Neon. Verificar [Neon status](https://neonstatus.com/).
   - Si no responde → problema de Render. Verificar [Render status](https://status.render.com/).

2. Revisar logs en Render Dashboard → Logs tab.
3. Si el error es de memoria/CPU, escalar en Render (Starter → Standard).

### 🔴 Errores de autenticación masivos

1. Revisar logs de Sentry para errores `401/403`.
2. Verificar `JWT_ACCESS_SECRET` y `JWT_REFRESH_SECRET` en variables de entorno de Render.
3. Si se rotaron secrets, todos los usuarios necesitarán re-login.

### 🔴 Rate limit triggered

- Si usuarios legítimos son bloqueados:
  1. Revisar el dashboard de Render para ver IPs origen.
  2. Si es un ataque DDoS: activar Cloudflare proxy o reglas de firewall.
  3. Ajustar límites temporalmente en `server.ts` (requiere deploy).

### 🔴 DB migrations fallan

1. Conectar a Neon via `psql`:
   ```bash
   psql "$(grep DATABASE_URL .env | sed 's/DATABASE_URL=//')"
   ```
2. Verificar estado de migraciones:
   ```sql
   SELECT * FROM "_prisma_migrations" ORDER BY finished_at DESC;
   ```
3. Si una migración está `failed`, resolver el problema manualmente y marcar como `rolled_back`:
   ```sql
   UPDATE "_prisma_migrations" SET status = 'rolled_back' WHERE id = '...';
   ```

### 🔴 Supabase Storage no funciona

1. Verificar `SUPABASE_URL` y `SUPABASE_SERVICE_ROLE_KEY` en Render.
2. Verificar que el bucket `fit_bucket` exista en Supabase Dashboard.
3. Revisar RLS policies: abrir SQL Editor en Supabase y ejecutar el contenido de `Backend/infrastructure/supabase-storage-rls.sql`.

### 🔴 Gemini API no responde

1. Verificar `GEMINI_API_KEY` en Render.
2. Revisar cuota de uso en [Google Cloud Console](https://console.cloud.google.com/).
3. El endpoint `/logs/analyze-menu-image` tiene fallback a 3 modelos (`gemini-2.5-flash-lite`, `gemini-2.5-flash`). Si todos fallan, retorna `502 GEMINI_REQUEST_FAILED`.

---

## 4. Rotación de secrets

> Cuando un secret se expone (ej. en un log o commit accidental), rotar inmediatamente.

### Rotar `GEMINI_API_KEY`

1. Ir a [Google AI Studio](https://aistudio.google.com/) → API keys → Delete old key.
2. Crear nueva key.
3. Actualizar en Render Dashboard → Environment Variables.
4. Trigger deploy manual para reiniciar el servicio.

### Rotar `SUPABASE_SERVICE_ROLE_KEY`

1. Supabase Dashboard → Project Settings → API → Service Role Key → Regenerate.
2. Actualizar en Render Dashboard.
3. Trigger deploy.

### Rotar `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET`

1. Generar nuevos secrets:
   ```bash
   node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
   ```
2. Actualizar en Render Dashboard.
3. **Advertencia**: todos los usuarios activos perderán sesión. Notificar antes de hacer esto.

### Rotar contraseña de Postgres

1. Neon Dashboard → Reset password.
2. Actualizar `DATABASE_URL` en Render (incluye la nueva contraseña).
3. Trigger deploy.

---

## 5. Monitoreo

### Sentry (errores)

- URL: [https://tu-proyecto.sentry.io](https://tu-proyecto.sentry.io)
- Alertas configuradas: Slack/email para errores con `status >= 500`.
- Sample rate: 10% en producción, 0% en desarrollo.

### UptimeRobot (disponibilidad)

- URL del monitor: `https://tu-api.onrender.com/health`
- Intervalo: 5 minutos.
- Alerta: email si cae por más de 10 minutos.

### Logs

- Render Dashboard → Logs tab (retención: 7 días en plan Starter).
- Para logs persistentes: exportar a Better Stack o CloudWatch (opcional).

---

## 6. Contactos de emergencia

| Servicio | URL de soporte / status |
|---|---|
| Render | https://status.render.com / support@render.com |
| Neon | https://neonstatus.com / support@neon.tech |
| Supabase | https://status.supabase.com / support@supabase.io |
| Google AI (Gemini) | https://status.cloud.google.com / Google Cloud Console |
| Sentry | https://status.sentry.io |

---

## 7. Notas adicionales

- El backend no almacena imágenes (bytes). Las subidas van directo a Supabase Storage via URL firmada.
- El `service_role` key de Supabase bypass RLS. Las RLS policies son solo defense-in-depth.
- `autoDeploy: false` en Render. Deploys solo via CI/CD o manual trigger.
