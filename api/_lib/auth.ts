import { createHmac, timingSafeEqual } from 'node:crypto'
import type { IncomingMessage } from 'node:http'

const COOKIE_NAME = 'mcca_session'

function getEnv(name: string): string {
  const v = process.env[name]
  if (!v || v.trim().length === 0) throw new Error(`Falta variable de entorno ${name}`)
  return v
}

function b64urlEncode(buf: Buffer) {
  return buf
    .toString('base64')
    .replaceAll('+', '-')
    .replaceAll('/', '_')
    .replaceAll('=', '')
}

function b64urlDecodeToBuffer(s: string) {
  const padLen = (4 - (s.length % 4)) % 4
  const padded = s.replaceAll('-', '+').replaceAll('_', '/') + '='.repeat(padLen)
  return Buffer.from(padded, 'base64')
}

function sign(data: string, secret: string) {
  return b64urlEncode(createHmac('sha256', secret).update(data).digest())
}

type SessionPayload = { exp: number }

export function makeSessionToken(payload: SessionPayload) {
  const secret = getEnv('AUTH_SECRET')
  const body = b64urlEncode(Buffer.from(JSON.stringify(payload), 'utf8'))
  const sig = sign(body, secret)
  return `${body}.${sig}`
}

export function verifySessionToken(token: string): SessionPayload | null {
  const secret = process.env.AUTH_SECRET
  if (!secret) return null

  const parts = token.split('.')
  if (parts.length !== 2) return null
  const [body, sig] = parts
  const expected = sign(body, secret)
  const sigBuf = Buffer.from(sig)
  const expBuf = Buffer.from(expected)
  if (sigBuf.length !== expBuf.length) return null
  if (!timingSafeEqual(sigBuf, expBuf)) return null

  try {
    const json = JSON.parse(b64urlDecodeToBuffer(body).toString('utf8')) as SessionPayload
    if (typeof json.exp !== 'number') return null
    if (Date.now() > json.exp) return null
    return json
  } catch {
    return null
  }
}

export function parseCookies(req: IncomingMessage) {
  const header = String(req.headers.cookie ?? '')
  const out: Record<string, string> = {}
  for (const part of header.split(';')) {
    const p = part.trim()
    if (!p) continue
    const eq = p.indexOf('=')
    if (eq < 0) continue
    const k = p.slice(0, eq).trim()
    const v = p.slice(eq + 1).trim()
    out[k] = decodeURIComponent(v)
  }
  return out
}

export function getSessionFromRequest(req: IncomingMessage) {
  const cookies = parseCookies(req)
  const token = cookies[COOKIE_NAME]
  if (!token) return null
  return verifySessionToken(token)
}

export function requireAppSession(req: IncomingMessage) {
  return Boolean(getSessionFromRequest(req))
}

export function requireDeviceToken(req: IncomingMessage) {
  const expected = process.env.DEVICE_TOKEN
  if (!expected || expected.trim().length === 0) return false
  const got = String(req.headers['x-device-token'] ?? '')
  return got === expected
}

export function buildSetCookieSession(token: string, maxAgeSeconds: number) {
  const secure = process.env.NODE_ENV === 'production'
  const parts = [
    `${COOKIE_NAME}=${encodeURIComponent(token)}`,
    `Path=/`,
    `HttpOnly`,
    `SameSite=Lax`,
    `Max-Age=${maxAgeSeconds}`,
  ]
  if (secure) parts.push('Secure')
  return parts.join('; ')
}

export function buildClearCookie() {
  const secure = process.env.NODE_ENV === 'production'
  const parts = [
    `${COOKIE_NAME}=`,
    `Path=/`,
    `HttpOnly`,
    `SameSite=Lax`,
    `Max-Age=0`,
  ]
  if (secure) parts.push('Secure')
  return parts.join('; ')
}

export function checkPassword(password: string) {
  const expected = getEnv('AUTH_PASSWORD')
  return password === expected
}

