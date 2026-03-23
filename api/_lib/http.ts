import type { IncomingMessage } from 'http'

export function isJsonContentType(req: IncomingMessage) {
  const ct = String(req.headers['content-type'] ?? '')
  return ct.includes('application/json')
}

export async function readBody(req: IncomingMessage): Promise<string> {
  return await new Promise((resolve, reject) => {
    let data = ''
    req.on('data', (chunk) => {
      data += chunk
    })
    req.on('end', () => resolve(data))
    req.on('error', reject)
  })
}

export async function readJson<T>(req: IncomingMessage): Promise<T> {
  const raw = await readBody(req)
  if (!raw || raw.trim().length === 0) {
    throw new Error('Body vacío')
  }
  return JSON.parse(raw) as T
}

export function sendJson(res: any, status: number, payload: unknown) {
  res.statusCode = status
  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  res.end(JSON.stringify(payload))
}

