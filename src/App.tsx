import { useMemo, useState } from 'react'
import reactLogo from './assets/react.svg'
import viteLogo from './assets/vite.svg'
import './App.css'
import { esp32Off, esp32SetText } from './lib/esp32Client'

function App() {
  const [text, setText] = useState('HOLA')
  const [speedMs, setSpeedMs] = useState(60)
  const [intensity, setIntensity] = useState(8)
  const [status, setStatus] = useState<string>('Listo.')
  const [busy, setBusy] = useState(false)

  const canSend = useMemo(() => {
    return text.trim().length > 0 && !busy
  }, [text, busy])

  async function onSendText() {
    if (!canSend) return
    setBusy(true)
    setStatus('Enviando texto al ESP32...')
    try {
      const ok = await esp32SetText({ text: text.trim(), speedMs, intensity })
      setStatus(ok ? 'OK: texto enviado.' : 'Error: no se pudo enviar.')
    } catch (e) {
      setStatus(`Error: ${(e as Error).message}`)
    } finally {
      setBusy(false)
    }
  }

  async function onOff() {
    if (busy) return
    setBusy(true)
    setStatus('Apagando matriz...')
    try {
      const ok = await esp32Off()
      setStatus(ok ? 'OK: apagado.' : 'Error: no se pudo apagar.')
    } catch (e) {
      setStatus(`Error: ${(e as Error).message}`)
    } finally {
      setBusy(false)
    }
  }

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
            Prueba desde el navegador: se llama al ESP32 vía <code>/api/*</code>.
            En dev usa proxy Vite; en prod usa <code>VITE_ESP32_BASE_URL</code>.
          </p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'center' }}>
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
            <button className="counter counterGhost" onClick={onOff} disabled={busy}>
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
