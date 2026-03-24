import type { VercelRequest, VercelResponse } from '@vercel/node'

export const config = {
  runtime: 'nodejs',
} as const

/**
 * Endpoint mínimo (sin imports locales) para comprobar que el runtime de Vercel ejecuta código.
 * Si esto falla, el problema no es Redis ni _lib/http.
 */
export default function handler(_req: VercelRequest, res: VercelResponse) {
  res.statusCode = 200
  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  res.end(JSON.stringify({ ok: true, ping: true, node: process.version }))
}
