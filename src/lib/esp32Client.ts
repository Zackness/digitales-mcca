export type Esp32TextPayload = {
  text: string
  speedMs?: number
  intensity?: number
}

export type Esp32PatternPayload = {
  bitmap: number[] // 8 elementos, cada uno representa una fila (x=0..31 como bits)
  invert?: boolean
  intensity?: number
}

type Esp32ApiOk = { ok: boolean }

function normalizeBaseUrl(baseUrl: string) {
  return baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl
}

function esp32Url(path: string) {
  const baseUrl = import.meta.env.VITE_ESP32_BASE_URL as string | undefined
  // Dev: usando el proxy de Vite (/esp32 -> ESP32 real) evita CORS.
  // Prod: si se configura VITE_ESP32_BASE_URL apuntamos directo al ESP32.
  if (baseUrl && baseUrl.trim().length > 0) return `${normalizeBaseUrl(baseUrl)}${path}`
  return `/esp32${path}`
}

async function postEsp32Json<TResponse extends object, TRequest extends object>(
  path: string,
  body: TRequest,
): Promise<TResponse | null> {
  const res = await fetch(esp32Url(path), {
    method: 'POST',
    // Para evitar preflight OPTIONS, usamos un "simple request":
    // content-type permitido para CORS: text/plain
    headers: { 'Content-Type': 'text/plain' },
    body: JSON.stringify(body) as unknown as BodyInit,
  })

  if (!res.ok) {
    // Consumimos el body para mostrar errores en consola si viene JSON.
    // (No lo retornamos para no romper el tipado.)
    try {
      await res.text()
    } catch {
      // noop
    }
    return null
  }

  // Puede venir {"ok":true} o un error JSON con ok:false.
  // Si no hay JSON, devolvemos null.
  try {
    return (await res.json()) as TResponse
  } catch {
    return null
  }
}

export async function esp32Off(): Promise<boolean> {
  const res = await fetch(esp32Url('/api/off'), { method: 'POST' })
  if (!res.ok) return false
  try {
    const json = (await res.json()) as Esp32ApiOk
    return Boolean(json.ok)
  } catch {
    return true // si no responde JSON pero OK, lo consideramos éxito
  }
}

export async function esp32SetText(payload: Esp32TextPayload): Promise<boolean> {
  const body: Esp32TextPayload = {
    text: payload.text,
    ...(typeof payload.speedMs === 'number' ? { speedMs: payload.speedMs } : {}),
    ...(typeof payload.intensity === 'number' ? { intensity: payload.intensity } : {}),
  }

  const json = await postEsp32Json<Esp32ApiOk, Esp32TextPayload>('/api/text', body)
  return Boolean(json?.ok)
}

export async function esp32SetPattern(payload: Esp32PatternPayload): Promise<boolean> {
  const body: Esp32PatternPayload = {
    bitmap: payload.bitmap,
    ...(typeof payload.invert === 'boolean' ? { invert: payload.invert } : {}),
    ...(typeof payload.intensity === 'number' ? { intensity: payload.intensity } : {}),
  }

  const json = await postEsp32Json<Esp32ApiOk, Esp32PatternPayload>(
    '/api/pattern',
    body,
  )
  return Boolean(json?.ok)
}

