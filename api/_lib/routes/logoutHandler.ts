import type { VercelRequest, VercelResponse } from '@vercel/node'
import { buildClearCookie } from '../auth'
import { sendJson } from '../http'

export const config = {
  runtime: 'nodejs',
} as const

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return sendJson(res, 405, { ok: false, error: 'Method not allowed' })
  }

  res.setHeader('Set-Cookie', buildClearCookie())
  return sendJson(res, 200, { ok: true })
}
