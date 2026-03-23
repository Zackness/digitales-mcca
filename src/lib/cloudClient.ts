import type { Esp32PatternPayload, Esp32TextPayload } from './esp32Client'

export type CloudStateResponse = {
  ok: boolean
  deviceId: string
  online: boolean
  lastSeen: number
  state: unknown | null
}

async function postJson<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    credentials: 'include',
  })
  if (!res.ok) throw new Error(await res.text())
  return (await res.json()) as T
}

async function getJson<T>(path: string): Promise<T> {
  const res = await fetch(path, { credentials: 'include' })
  if (!res.ok) throw new Error(await res.text())
  return (await res.json()) as T
}

export async function cloudLogin(password: string): Promise<boolean> {
  const json = await postJson<{ ok: boolean }>('/api/auth/login', { password })
  return Boolean(json.ok)
}

export async function cloudLogout(): Promise<boolean> {
  const json = await postJson<{ ok: boolean }>('/api/auth/logout', {})
  return Boolean(json.ok)
}

export async function cloudSendOff(deviceId: string): Promise<boolean> {
  const json = await postJson<{ ok: boolean }>('/api/app/send', { deviceId, command: { type: 'off' } })
  return Boolean(json.ok)
}

export async function cloudSendText(deviceId: string, payload: Esp32TextPayload): Promise<boolean> {
  const json = await postJson<{ ok: boolean }>('/api/app/send', {
    deviceId,
    command: { type: 'text', ...payload },
  })
  return Boolean(json.ok)
}

export async function cloudSendPattern(deviceId: string, payload: Esp32PatternPayload): Promise<boolean> {
  const json = await postJson<{ ok: boolean }>('/api/app/send', {
    deviceId,
    command: { type: 'pattern', ...payload },
  })
  return Boolean(json.ok)
}

export async function cloudGetState(deviceId: string): Promise<CloudStateResponse> {
  const qp = new URLSearchParams({ deviceId })
  return await getJson<CloudStateResponse>(`/api/app/state?${qp.toString()}`)
}

