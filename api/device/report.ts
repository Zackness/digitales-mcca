import type { VercelRequest, VercelResponse } from '@vercel/node'
import { requireDeviceToken } from '../_lib/auth'
import { readJson, sendJson } from '../_lib/http'
import { getRedis, keyLastSeen, keyState } from '../_lib/redis'
import type { Esp32State } from '../_lib/types'

type Body = { deviceId?: string; state?: Esp32State }

function isValidDeviceId(deviceId: string) {
  return /^[a-zA-Z0-9_-]{1,64}$/.test(deviceId)
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return sendJson(res, 405, { ok: false, error: 'Method not allowed' })
  }
  if (!requireDeviceToken(req)) return sendJson(res, 401, { ok: false, error: 'No autorizado' })

  try {
    const body = await readJson<Body>(req)
    const deviceId = String(body.deviceId ?? '')
    if (!isValidDeviceId(deviceId)) return sendJson(res, 400, { ok: false, error: 'deviceId inválido' })
    const state = body.state
    if (!state || typeof state !== 'object') return sendJson(res, 400, { ok: false, error: 'Falta state' })

    const redis = getRedis()
    await Promise.all([
      redis.set(keyState(deviceId), JSON.stringify(state), { ex: 60 * 60 * 24 }),
      redis.set(keyLastSeen(deviceId), Date.now(), { ex: 60 }),
    ])

    return sendJson(res, 200, { ok: true })
  } catch (e) {
    return sendJson(res, 400, { ok: false, error: (e as Error).message })
  }
}

