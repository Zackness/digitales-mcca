import { Redis } from '@upstash/redis'

function getEnv(name: string): string | undefined {
  const v = process.env[name]
  return v && v.trim().length > 0 ? v : undefined
}

export function getRedis() {
  const url =
    getEnv('KV_REST_API_URL') ??
    getEnv('UPSTASH_REDIS_REST_URL') ??
    getEnv('UPSTASH_REDIS_REST_URL'.toLowerCase())
  const token =
    getEnv('KV_REST_API_TOKEN') ??
    getEnv('UPSTASH_REDIS_REST_TOKEN') ??
    getEnv('UPSTASH_REDIS_REST_TOKEN'.toLowerCase())

  if (!url || !token) {
    throw new Error(
      'Faltan variables Redis. Define KV_REST_API_URL y KV_REST_API_TOKEN (Vercel KV) o UPSTASH_REDIS_REST_URL/TOKEN.',
    )
  }

  return new Redis({ url, token })
}

export function keyCmdQueue(deviceId: string) {
  return `mcca:cmdq:${deviceId}`
}

export function keyState(deviceId: string) {
  return `mcca:state:${deviceId}`
}

export function keyLastSeen(deviceId: string) {
  return `mcca:lastSeen:${deviceId}`
}

