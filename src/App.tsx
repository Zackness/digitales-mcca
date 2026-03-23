import { useEffect, useMemo, useState } from 'react'
import reactLogo from './assets/react.svg'
import viteLogo from './assets/vite.svg'
import './App.css'
import { cloudGetState, cloudLogin, cloudLogout, cloudSendOff, cloudSendText } from './lib/cloudClient'

function App() {
  const [deviceId, setDeviceId] = useState('mcca-8x32')
  const [password, setPassword] = useState('')
  const [authed, setAuthed] = useState(false)

  const [text, setText] = useState('HOLA')
  const [speedMs, setSpeedMs] = useState(60)
  const [intensity, setIntensity] = useState(8)
  const [status, setStatus] = useState<string>('Listo.')
  const [busy, setBusy] = useState(false)
  const [online, setOnline] = useState<boolean | null>(null)
  const [lastSeen, setLastSeen] = useState<number>(0)

  const canSend = useMemo(() => {
    return authed && deviceId.trim().length > 0 && text.trim().length > 0 && !busy
  }, [authed, deviceId, text, busy])

  const canOff = useMemo(() => {
    return authed && deviceId.trim().length > 0 && !busy
  }, [authed, deviceId, busy])

  async function onLogin() {
    if (busy) return
    setBusy(true)
    setStatus('Iniciando sesión...')
    try {
      const ok = await cloudLogin(password)
      setAuthed(ok)
      setStatus(ok ? 'OK: sesión iniciada.' : 'Error: credenciales inválidas.')
    } catch (e) {
      setAuthed(false)
      setStatus(`Error: ${(e as Error).message}`)
    } finally {
      setBusy(false)
    }
  }

  async function onLogout() {
    if (busy) return
    setBusy(true)
    setStatus('Cerrando sesión...')
    try {
      const ok = await cloudLogout()
      setAuthed(!ok ? authed : false)
      setOnline(null)
      setLastSeen(0)
      setStatus(ok ? 'OK: sesión cerrada.' : 'Error: no se pudo cerrar sesión.')
    } catch (e) {
      setStatus(`Error: ${(e as Error).message}`)
    } finally {
      setBusy(false)
    }
  }

  async function refreshStateOnce() {
    if (!authed) return
    const id = deviceId.trim()
    if (id.length === 0) return
    try {
      const s = await cloudGetState(id)
      setOnline(Boolean(s.online))
      setLastSeen(Number(s.lastSeen ?? 0))
    } catch {
      setOnline(false)
    }
  }

  async function onSendText() {
    if (!canSend) return
    setBusy(true)
    setStatus('Enviando texto (cloud -> ESP32)...')
    try {
      const ok = await cloudSendText(deviceId.trim(), { text: text.trim(), speedMs, intensity })
      setStatus(ok ? 'OK: texto enviado.' : 'Error: no se pudo enviar.')
    } catch (e) {
      setStatus(`Error: ${(e as Error).message}`)
    } finally {
      setBusy(false)
    }
  }

  async function onOff() {
    if (!canOff) return
    setBusy(true)
    setStatus('Apagando matriz...')
    try {
      const ok = await cloudSendOff(deviceId.trim())
      setStatus(ok ? 'OK: apagado.' : 'Error: no se pudo apagar.')
    } catch (e) {
      setStatus(`Error: ${(e as Error).message}`)
    } finally {
      setBusy(false)
    }
  }

  // Polling de estado (simple). Si quieres, luego lo hacemos con SSE/WebSocket.
  useEffect(() => {
    let t: number | undefined
    if (authed && deviceId.trim().length > 0) {
      void refreshStateOnce()
      t = window.setInterval(() => {
        void refreshStateOnce()
      }, 2000)
    } else {
      setOnline(null)
      setLastSeen(0)
    }
    return () => {
      if (t) window.clearInterval(t)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authed, deviceId])

  return (
    <>
      <section id="center">
        <div className="hero">
          <img src={reactLogo} className="framework" alt="React logo" />
          <img src={viteLogo} className="vite" alt="Vite logo" />
        </div>
        <div>
          <h1>ESP32 + Max7219</h1>
          <p>
            Control remoto: el navegador llama a <code>/api/*</code> en Vercel, y tu ESP32 “pulea”
            comandos por Internet (sin abrir puertos).
          </p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'center' }}>
          <label className="field" style={{ width: 420, maxWidth: '100%' }}>
            Device ID:
            <input
              value={deviceId}
              onChange={(e) => setDeviceId(e.target.value)}
              style={{ width: '100%', marginTop: 6, padding: 10, borderRadius: 6 }}
              placeholder="mcca-8x32"
              maxLength={64}
            />
          </label>

          {!authed ? (
            <div style={{ display: 'flex', gap: 12, width: 420, maxWidth: '100%' }}>
              <label className="field" style={{ flex: 1 }}>
                Password:
                <input
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  style={{ width: '100%', marginTop: 6, padding: 10, borderRadius: 6 }}
                  placeholder="••••••••"
                  type="password"
                />
              </label>
              <button
                className="counter counterPrimary"
                onClick={onLogin}
                disabled={busy || password.trim().length === 0}
              >
                {busy ? '...' : 'Login'}
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', gap: 12, width: 420, maxWidth: '100%', alignItems: 'center' }}>
              <div style={{ flex: 1, textAlign: 'left' }}>
                Estado:{' '}
                <strong>
                  {online === null ? '—' : online ? 'ONLINE' : 'OFFLINE'}
                </strong>
                {lastSeen > 0 ? (
                  <span style={{ marginLeft: 8, opacity: 0.8 }}>
                    lastSeen: {new Date(lastSeen).toLocaleTimeString()}
                  </span>
                ) : null}
              </div>
              <button className="counter counterGhost" onClick={onLogout} disabled={busy}>
                {busy ? '...' : 'Logout'}
              </button>
            </div>
          )}

          <label className="field" style={{ width: 420, maxWidth: '100%' }}>
            Texto (scroll):
            <input
              value={text}
              onChange={(e) => setText(e.target.value)}
              style={{ width: '100%', marginTop: 6, padding: 10, borderRadius: 6 }}
              placeholder="HOLA"
              maxLength={64}
            />
          </label>

          <div style={{ display: 'flex', gap: 12, width: 420, maxWidth: '100%' }}>
            <label className="field" style={{ flex: 1 }}>
              speedMs:
              <input
                type="number"
                value={speedMs}
                onChange={(e) => setSpeedMs(Number(e.target.value))}
                style={{ width: '100%', marginTop: 6, padding: 10, borderRadius: 6 }}
                min={5}
                max={2000}
              />
            </label>
            <label className="field" style={{ flex: 1 }}>
              intensity:
              <input
                type="number"
                value={intensity}
                onChange={(e) => setIntensity(Number(e.target.value))}
                style={{ width: '100%', marginTop: 6, padding: 10, borderRadius: 6 }}
                min={0}
                max={15}
              />
            </label>
          </div>

          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <button className="counter counterPrimary" onClick={onSendText} disabled={!canSend}>
              {busy ? '...' : 'Enviar texto'}
            </button>
            <button className="counter counterGhost" onClick={onOff} disabled={!canOff}>
              {busy ? '...' : 'Apagar'}
            </button>
          </div>

          <div className={`status ${status.startsWith('Error') ? 'statusError' : ''}`} aria-live="polite">
            {status}
          </div>
        </div>
      </section>

      <div className="ticks"></div>

      <section id="next-steps">
        <div id="docs">
          <svg className="icon" role="presentation" aria-hidden="true">
            <use href="/icons.svg#documentation-icon"></use>
          </svg>
          <h2>Documentation</h2>
          <p>Your questions, answered</p>
          <ul>
            <li>
              <a href="https://vite.dev/" target="_blank">
                <img className="logo" src={viteLogo} alt="" />
                Explore Vite
              </a>
            </li>
            <li>
              <a href="https://react.dev/" target="_blank">
                <img className="button-icon" src={reactLogo} alt="" />
                Learn more
              </a>
            </li>
          </ul>
        </div>
        <div id="social">
          <svg className="icon" role="presentation" aria-hidden="true">
            <use href="/icons.svg#social-icon"></use>
          </svg>
          <h2>Connect with us</h2>
          <p>Join the Vite community</p>
          <ul>
            <li>
              <a href="https://github.com/vitejs/vite" target="_blank">
                <svg
                  className="button-icon"
                  role="presentation"
                  aria-hidden="true"
                >
                  <use href="/icons.svg#github-icon"></use>
                </svg>
                GitHub
              </a>
            </li>
            <li>
              <a href="https://chat.vite.dev/" target="_blank">
                <svg
                  className="button-icon"
                  role="presentation"
                  aria-hidden="true"
                >
                  <use href="/icons.svg#discord-icon"></use>
                </svg>
                Discord
              </a>
            </li>
            <li>
              <a href="https://x.com/vite_js" target="_blank">
                <svg
                  className="button-icon"
                  role="presentation"
                  aria-hidden="true"
                >
                  <use href="/icons.svg#x-icon"></use>
                </svg>
                X.com
              </a>
            </li>
            <li>
              <a href="https://bsky.app/profile/vite.dev" target="_blank">
                <svg
                  className="button-icon"
                  role="presentation"
                  aria-hidden="true"
                >
                  <use href="/icons.svg#bluesky-icon"></use>
                </svg>
                Bluesky
              </a>
            </li>
          </ul>
        </div>
      </section>

      <div className="ticks"></div>
      <section id="spacer"></section>
    </>
  )
}

export default App
