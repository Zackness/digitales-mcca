import type { VercelRequest, VercelResponse } from '@vercel/node'
import { buildSetCookieSession, checkPassword, makeSessionToken } from '../_lib/auth'
import { readJson, sendJson } from '../_lib/http'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return sendJson(res, 405, { ok: false, error: 'Method not allowed' })
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
    return sendJson(res, 400, { ok: false, error: (e as Error).message })
  }
}

