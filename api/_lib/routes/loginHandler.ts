import type { VercelRequest, VercelResponse } from '@vercel/node'
import { buildSetCookieSession, checkPassword, isAuthConfigured, makeSessionToken } from '../auth'
import { readJson, sendJson } from '../http'

export const config = {
  runtime: 'nodejs',
  maxDuration: 30,
} as const

function errMessage(e: unknown): string {
  if (e instanceof Error) return e.message
  return String(e)
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'OPTIONS') {
    res.statusCode = 204
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
    res.setHeader('Access-Control-Max-Age', '86400')
    return res.end()
  }

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST, OPTIONS')
    return sendJson(res, 405, { ok: false, error: 'Method not allowed' })
  }

  if (!isAuthConfigured()) {
    console.error(
      '[login] Faltan AUTH_SECRET o AUTH_PASSWORD. Revisa Variables de entorno en Vercel (entorno Production).',
    )
    return sendJson(res, 503, {
      ok: false,
      error:
        'Servidor no configurado: define AUTH_SECRET y AUTH_PASSWORD en Vercel (Production, Preview según el despliegue).',
    })
  }

  try {
    const body = await readJson<{ password?: string }>(req)
    const password = String(body.password ?? '')
    if (!checkPassword(password)) {
      return sendJson(res, 401, { ok: false, error: 'Credenciales inválidas' })
    }

    const maxAgeSeconds = 60 * 60 * 24 * 7
    const token = makeSessionToken({ exp: Date.now() + maxAgeSeconds * 1000 })
    res.setHeader('Set-Cookie', buildSetCookieSession(token, maxAgeSeconds))
    return sendJson(res, 200, { ok: true })
  } catch (e) {
    console.error('[login]', e)
    return sendJson(res, 400, { ok: false, error: errMessage(e) })
  }
}
