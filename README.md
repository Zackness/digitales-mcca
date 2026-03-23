# digitales-mcca (Web + ESP32 remoto)

Este repo contiene:

- **Frontend (Vite + React)** en `src/`
- **API para Vercel (Serverless Functions)** en `api/`

La idea es que la web (en Vercel) hable con su propio backend `/api/*`, y el ESP32 se conecte por Internet **sin abrir puertos** haciendo polling HTTPS.

## Arquitectura

- **Web (Vercel)**:
  - Login: `POST /api/auth/login` (cookie HttpOnly)
  - Enviar comando: `POST /api/app/send`
  - Consultar estado: `GET /api/app/state?deviceId=...`
- **ESP32**:
  - Poll comando: `POST /api/device/poll` con header `x-device-token`
  - Reportar estado: `POST /api/device/report` con header `x-device-token`

Los comandos se guardan en una cola (Redis) y el estado se persiste con TTL.

## Variables de entorno (Vercel)

En tu proyecto de Vercel ve a **Settings → Environment Variables** y define:

- **`AUTH_SECRET`**: un secreto largo para firmar la cookie.
- **`AUTH_PASSWORD`**: password para entrar a la web.
- **`DEVICE_TOKEN`**: token que llevará el ESP32 en `x-device-token`.
- **Vercel KV** (recomendado):
  - **`KV_REST_API_URL`**
  - **`KV_REST_API_TOKEN`**

> Si usas Upstash directo, también valen `UPSTASH_REDIS_REST_URL` y `UPSTASH_REDIS_REST_TOKEN`.
>
> Si usas una integración de Redis que te da un string tipo `redis://...`, también funciona con:
> - **`REDIS_URL`** o cualquier variable que termine en **`_REDIS_URL`** (por ejemplo `digitalesmcca_REDIS_URL`).

## Desarrollo local

```bash
npm install
npm run dev
```

La API `api/*` está pensada para Vercel. Para pruebas locales puedes desplegar a Vercel Preview o usar `vercel dev` (opcional).

