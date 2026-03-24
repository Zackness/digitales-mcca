import type { VercelRequest, VercelResponse } from '@vercel/node'
import { requireDeviceToken } from '../auth'
import { readJson, sendJson } from '../http'
import { getRedis, keyCmdQueue, keyLastSeen } from '../redis'
import type { Esp32Command } from '../types'

export const config = {
  runtime: 'nodejs',
} as const

type Body = { deviceId?: string }

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

    const redis = getRedis()
    const cmdRaw = await redis.lpop<string>(keyCmdQueue(deviceId))
    await redis.set(keyLastSeen(deviceId), Date.now(), { ex: 60 })

    if (!cmdRaw) return sendJson(res, 200, { ok: true, command: null })

    let command: Esp32Command | null = null
    try {
      command = JSON.parse(cmdRaw) as Esp32Command
    } catch {
      command = null
    }

    return sendJson(res, 200, { ok: true, command })
  } catch (e) {
    return sendJson(res, 400, { ok: false, error: (e as Error).message })
  }
}
