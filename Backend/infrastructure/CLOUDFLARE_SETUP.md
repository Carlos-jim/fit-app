# Guía de configuración de Cloudflare para Bioma

> **Importante:** podés comprar el dominio en cualquier registrar (Namecheap, GoDaddy, Google Domains, Porkbun, etc.). No hace falta comprarlo en Cloudflare. Cloudflare se usa acá como **DNS + proxy + seguridad**.

## 1. Comprar el dominio

Opciones populares y económicas:

- [Namecheap](https://www.namecheap.com/)
- [Porkbun](https://porkbun.com/)
- [Google Domains](https://domains.google/)
- [GoDaddy](https://www.godaddy.com/)
- [Cloudflare Registrar](https://dash.cloudflare.com/sign-up)

Buscar un dominio disponible (ej. `bioma.app`, `biomafit.com`, `tunutri.app`) y completar la compra.

## 2. Apuntar el dominio a Cloudflare (si compraste fuera de Cloudflare)

Si compraste en Namecheap u otro registrar:

1. Ir al panel del registrar.
2. Buscar la sección **Nameservers**.
3. Reemplazar los nameservers por los que te da Cloudflare (ver paso 3).

## 3. Agregar el dominio a Cloudflare

1. En el dashboard de Cloudflare, hacer clic en **Add a Site**.
2. Ingresar el dominio comprado.
3. Seleccionar el plan **Free**.
4. Cloudflare escaneará los registros DNS existentes. Si es nuevo, no habrá ninguno.

## 4. Configurar DNS

Crear los siguientes registros DNS:

| Type | Name | Target | Proxy status | TTL |
|---|---|---|---|---|
| A | `@` | IP pública de Render (ver paso 5) | Proxied | Auto |
| CNAME | `www` | `bioma-api.onrender.com` o tu dominio raíz | Proxied | Auto |
| CNAME | `api` | `bioma-api.onrender.com` | Proxied | Auto |

> El nombre del servicio en Render determina el hostname inicial. Si tu servicio se llama `bioma-api`, el dominio de Render será `bioma-api.onrender.com`.

## 5. Obtener la IP pública de Render

Opción A: si usás un dominio personalizado en Render, Render te pedirá un CNAME, no una A. En ese caso:

1. En Render, ir a tu servicio web → **Settings** → **Custom Domains**.
2. Agregar `api.tudominio.com`.
3. Render te dará un valor CNAME como `bioma-api.onrender.com`.
4. En Cloudflare, crear un registro CNAME `api` apuntando a ese valor.

Opción B: si necesitás una IP fija, Render no la ofrece en el plan gratuito. La opción recomendada es usar CNAME.

## 6. Forzar HTTPS

1. En Cloudflare, ir a **SSL/TLS**.
2. Seleccionar el modo **Full (strict)** si tenés certificado propio, o **Full** si no.
3. Ir a **SSL/TLS → Edge Certificates**.
4. Activar **Always Use HTTPS**.
5. Activar **Automatic HTTPS Rewrites**.

## 7. Configurar HSTS

1. En **SSL/TLS → Edge Certificates**.
2. Activar **HSTS** (HTTP Strict Transport Security).
3. Configurar:
   - Max Age: 1 year
   - Include subdomains: ON
   - Preload: OFF (a menos que sepas lo que hacés)

## 8. Reglas de seguridad básicas

### Firewall

1. Ir a **Security → WAF → Custom rules**.
2. Crear una regla para bloquear tráfico de países innecesarios (opcional):
   - `(not ip.geoip.country in {"US" "MX" "ES" "AR" "CO" "CL" "PE"})`
   - Action: Block

> Ajustar la lista de países según el público objetivo.

### Bot Fight Mode

1. Ir a **Security → Bots**.
2. Activar **Bot Fight Mode** en el plan gratuito.

## 9. Configurar CORS en el backend

Una vez que el dominio esté apuntado, restringir CORS en `Backend/src/server.ts`:

```ts
const allowedOrigins = [
  "https://tudominio.com",
  "https://api.tudominio.com",
  "http://localhost:8081", // desarrollo Expo
];

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
  }),
);
```

## 10. Actualizar el frontend

En `frontend/.env` de producción:

```env
EXPO_PUBLIC_API_BASE_URL=https://api.tudominio.com
```

## 11. Verificar

1. Esperar a que propague el DNS (puede tardar hasta 24 horas, usualmente minutos).
2. Hacer `curl https://api.tudominio.com/health`.
3. Debería responder con:

```json
{
  "data": {
    "ok": true,
    "service": "bioma-backend",
    "database": "connected"
  }
}
```

## 12. UptimeRobot (monitoreo)

1. Crear cuenta en [UptimeRobot](https://uptimerobot.com/).
2. Agregar monitor tipo **HTTP(s)**.
3. URL: `https://api.tudominio.com/health`.
4. Intervalo: 5 minutos (gratis).
5. Configurar alerta por email.
