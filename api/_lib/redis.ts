import { Redis as UpstashRedis } from '@upstash/redis'
import { createClient, type RedisClientType } from 'redis'

function getEnv(name: string): string | undefined {
  const v = process.env[name]
  return v && v.trim().length > 0 ? v : undefined
}

type RedisLike = {
  get<T = unknown>(key: string): Promise<T | null>
  set(key: string, value: string | number, opts?: { ex?: number }): Promise<unknown>
  rpush(key: string, value: string): Promise<unknown>
  lpop<T = unknown>(key: string): Promise<T | null>
  ltrim(key: string, start: number, stop: number): Promise<unknown>
}

function findAnyEnvEndingWith(suffix: string): string | undefined {
  for (const [k, v] of Object.entries(process.env)) {
    if (!v) continue
    if (k === suffix) return v
    if (k.endsWith(`_${suffix}`)) return v
  }
  return undefined
}

let nodeRedisClientPromise: Promise<RedisClientType> | null = null

async function getNodeRedisClient(url: string) {
  if (!nodeRedisClientPromise) {
    const client = createClient({ url })
    nodeRedisClientPromise = client.connect().then(() => client)
  }
  return await nodeRedisClientPromise
}

async function getRedisViaNodeRedis(redisUrl: string): Promise<RedisLike> {
  const client = await getNodeRedisClient(redisUrl)
  return {
    async get<T = unknown>(key: string) {
      const v = await client.get(key)
      return (v as unknown as T) ?? null
    },
    async set(key: string, value: string | number, opts?: { ex?: number }) {
      if (opts?.ex) return await client.set(key, String(value), { EX: opts.ex })
      return await client.set(key, String(value))
    },
    async rpush(key: string, value: string) {
      return await client.rPush(key, value)
    },
    async lpop<T = unknown>(key: string) {
      const v = await client.lPop(key)
      return (v as unknown as T) ?? null
    },
    async ltrim(key: string, start: number, stop: number) {
      return await client.lTrim(key, start, stop)
    },
  }
}

function getRedisViaUpstashRest(): RedisLike {
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
      'Faltan variables Redis REST. Define KV_REST_API_URL y KV_REST_API_TOKEN (Vercel KV) o UPSTASH_REDIS_REST_URL/TOKEN.',
    )
  }

  return new UpstashRedis({ url, token }) as unknown as RedisLike
}

export function getRedis(): RedisLike {
  const redisUrl = getEnv('REDIS_URL') ?? findAnyEnvEndingWith('REDIS_URL')
  if (redisUrl) {
    // Nota: devolvemos un proxy async; las rutas ya usan await, así que funciona.
    // Para mantener el API igual, retornamos un objeto cuyos métodos esperan a la conexión.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const lazy: any = {}
    const p = getRedisViaNodeRedis(redisUrl)
    lazy.get = async (k: string) => (await p).get(k)
    lazy.set = async (k: string, v: string | number, o?: { ex?: number }) => (await p).set(k, v, o)
    lazy.rpush = async (k: string, v: string) => (await p).rpush(k, v)
    lazy.lpop = async (k: string) => (await p).lpop(k)
    lazy.ltrim = async (k: string, s: number, t: number) => (await p).ltrim(k, s, t)
    return lazy as RedisLike
  }

  return getRedisViaUpstashRest()
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

