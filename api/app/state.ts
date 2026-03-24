import type { VercelRequest, VercelResponse } from '@vercel/node'
import { requireAppSession } from '../_lib/auth'
import { sendJson } from '../_lib/http'
import { getRedis, keyLastSeen, keyState } from '../_lib/redis'
import type { Esp32State } from '../_lib/types'

export const config = {
  runtime: 'nodejs',
} as const

function isValidDeviceId(deviceId: string) {
  return /^[a-zA-Z0-9_-]{1,64}$/.test(deviceId)
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    return sendJson(res, 405, { ok: false, error: 'Method not allowed' })
  }
  if (!requireAppSession(req)) return sendJson(res, 401, { ok: false, error: 'No autorizado' })

  const deviceId = String(req.query.deviceId ?? '')
  if (!isValidDeviceId(deviceId)) return sendJson(res, 400, { ok: false, error: 'deviceId inválido' })

  try {
    const redis = getRedis()
    const [stateRaw, lastSeenRaw] = await Promise.all([
      redis.get<string>(keyState(deviceId)),
      redis.get<number>(keyLastSeen(deviceId)),
    ])

    const lastSeen = typeof lastSeenRaw === 'number' ? lastSeenRaw : 0
    const online = lastSeen > 0 && Date.now() - lastSeen < 15_000

    let state: Esp32State | null = null
    if (typeof stateRaw === 'string' && stateRaw.trim().length > 0) {
      try {
        state = JSON.parse(stateRaw) as Esp32State
      } catch {
        state = null
      }
    }

    return sendJson(res, 200, { ok: true, deviceId, online, lastSeen, state })
  } catch (e) {
    return sendJson(res, 500, { ok: false, error: (e as Error).message })
  }
}

