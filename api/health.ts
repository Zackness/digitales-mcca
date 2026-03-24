import type { VercelRequest, VercelResponse } from '@vercel/node'
import { isAuthConfigured } from './_lib/auth'
import { sendJson } from './_lib/http'

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

export default function handler(_req: VercelRequest, res: VercelResponse) {
  const env = {
    AUTH_SECRET: Boolean(process.env.AUTH_SECRET),
    AUTH_PASSWORD: Boolean(process.env.AUTH_PASSWORD),
    DEVICE_TOKEN: Boolean(process.env.DEVICE_TOKEN),
    KV_REST_API_URL: Boolean(process.env.KV_REST_API_URL) || hasAnyEnvEndingWith('KV_REST_API_URL'),
    KV_REST_API_TOKEN: Boolean(process.env.KV_REST_API_TOKEN) || hasAnyEnvEndingWith('KV_REST_API_TOKEN'),
    REDIS_URL: Boolean(process.env.REDIS_URL) || hasAnyEnvEndingWith('REDIS_URL'),
  }

  sendJson(res, 200, {
    ok: true,
    node: process.version,
    env,
    authConfigured: isAuthConfigured(),
  })
}

