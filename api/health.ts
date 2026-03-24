import type { VercelRequest, VercelResponse } from '@vercel/node'

export const config = {
  runtime: 'nodejs',
} as const

function hasAnyEnvEndingWith(suffix: string) {
  for (const [k, v] of Object.entries(process.env)) {
    if (!v) continue
    if (k === suffix) return true
    if (k.endsWith(`_${suffix}`)) return true
  }
  return false
}

function authConfigured() {
  return Boolean(process.env.AUTH_PASSWORD?.trim() && process.env.AUTH_SECRET?.trim())
}

/**
 * Sin imports de ./_lib: evita que un fallo en otro módulo tumbe /api/health en producción.
 */
export default function handler(_req: VercelRequest, res: VercelResponse) {
  try {
    const env = {
      AUTH_SECRET: Boolean(process.env.AUTH_SECRET),
      AUTH_PASSWORD: Boolean(process.env.AUTH_PASSWORD),
      DEVICE_TOKEN: Boolean(process.env.DEVICE_TOKEN),
      KV_REST_API_URL: Boolean(process.env.KV_REST_API_URL) || hasAnyEnvEndingWith('KV_REST_API_URL'),
      KV_REST_API_TOKEN: Boolean(process.env.KV_REST_API_TOKEN) || hasAnyEnvEndingWith('KV_REST_API_TOKEN'),
      REDIS_URL: Boolean(process.env.REDIS_URL) || hasAnyEnvEndingWith('REDIS_URL'),
    }

    const body = JSON.stringify({
      ok: true,
      node: process.version,
      env,
      authConfigured: authConfigured(),
    })

    res.statusCode = 200
    res.setHeader('Content-Type', 'application/json; charset=utf-8')
    res.end(body)
  } catch (e) {
    res.statusCode = 500
    res.setHeader('Content-Type', 'application/json; charset=utf-8')
    res.end(
      JSON.stringify({
        ok: false,
        error: e instanceof Error ? e.message : String(e),
      }),
    )
  }
}
