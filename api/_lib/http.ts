import type { IncomingMessage, ServerResponse } from 'node:http'

export function isJsonContentType(req: IncomingMessage) {
  const ct = String(req.headers['content-type'] ?? '')
  return ct.includes('application/json')
}

export async function readBody(req: IncomingMessage): Promise<string> {
  let data = ''
  // En algunos entornos (como serverless), el body puede ya venir consumido/parsiado.
  // El iterador async resuelve correctamente incluso si el stream ya terminó.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const anyReq = req as any
  if (typeof anyReq.body === 'string') return anyReq.body
  if (anyReq.body && typeof anyReq.body === 'object') return JSON.stringify(anyReq.body)

  // Node stream
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  for await (const chunk of req as any) {
    data += chunk.toString()
  }
  return data
}

export async function readJson<T>(req: IncomingMessage): Promise<T> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const anyReq = req as any
  // Si Vercel ya lo parseó, úsalo directo
  if (anyReq.body !== undefined && anyReq.body !== null) {
    if (typeof anyReq.body === 'string') {
      const raw = anyReq.body
      if (!raw || raw.trim().length === 0) throw new Error('Body vacío')
      return JSON.parse(raw) as T
    }
    // Buffer / Uint8Array (algunos runtimes envían el body así)
    if (typeof Buffer !== 'undefined' && Buffer.isBuffer(anyReq.body)) {
      const raw = anyReq.body.toString('utf8')
      if (!raw || raw.trim().length === 0) throw new Error('Body vacío')
      return JSON.parse(raw) as T
    }
    if (anyReq.body instanceof Uint8Array && !(anyReq.body instanceof Buffer)) {
      const raw = Buffer.from(anyReq.body).toString('utf8')
      if (!raw || raw.trim().length === 0) throw new Error('Body vacío')
      return JSON.parse(raw) as T
    }
    // Objeto JSON ya parseado (Vercel / middlewares)
    if (typeof anyReq.body === 'object' && !Array.isArray(anyReq.body)) {
      return anyReq.body as T
    }
    if (Array.isArray(anyReq.body)) {
      return anyReq.body as T
    }
  }

  const raw = await readBody(req)
  if (!raw || raw.trim().length === 0) throw new Error('Body vacío')
  return JSON.parse(raw) as T
}

export function sendJson(res: ServerResponse, status: number, payload: unknown) {
  if (res.headersSent) return
  res.statusCode = status
  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  try {
    res.end(JSON.stringify(payload))
  } catch {
    res.statusCode = 500
    res.end(JSON.stringify({ ok: false, error: 'Error serializando respuesta' }))
  }
}

