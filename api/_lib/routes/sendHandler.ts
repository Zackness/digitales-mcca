import type { VercelRequest, VercelResponse } from '@vercel/node'
import { requireAppSession } from '../auth'
import { readJson, sendJson } from '../http'
import { getRedis, keyCmdQueue } from '../redis'
import type { Esp32Command } from '../types'

export const config = {
  runtime: 'nodejs',
} as const

type Body = {
  deviceId?: string
  command?: Esp32Command
}

function isValidDeviceId(deviceId: string) {
  return /^[a-zA-Z0-9_-]{1,64}$/.test(deviceId)
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return sendJson(res, 405, { ok: false, error: 'Method not allowed' })
  }
  if (!requireAppSession(req)) return sendJson(res, 401, { ok: false, error: 'No autorizado' })

  try {
    const body = await readJson<Body>(req)
    const deviceId = String(body.deviceId ?? '')
    if (!isValidDeviceId(deviceId)) return sendJson(res, 400, { ok: false, error: 'deviceId inválido' })
    const command = body.command
    if (!command || typeof command !== 'object') return sendJson(res, 400, { ok: false, error: 'Falta command' })

    if (command.type === 'text') {
      if (typeof command.text !== 'string' || command.text.trim().length === 0) {
        return sendJson(res, 400, { ok: false, error: 'text inválido' })
      }
    }
    if (command.type === 'pattern') {
      if (!Array.isArray(command.bitmap) || command.bitmap.length !== 8) {
        return sendJson(res, 400, { ok: false, error: 'bitmap debe tener 8 filas' })
      }
    }

    const redis = getRedis()
    await redis.rpush(keyCmdQueue(deviceId), JSON.stringify(command))
    await redis.ltrim(keyCmdQueue(deviceId), -50, -1)
    return sendJson(res, 200, { ok: true })
  } catch (e) {
    return sendJson(res, 400, { ok: false, error: (e as Error).message })
  }
}
