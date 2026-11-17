import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
// Self-hosted Geist (Fontsource): same files Google Fonts served, but from our own domain and
// preloaded (see vite.config.ts), so text doesn't wait on a third-party stylesheet.
import '@fontsource-variable/geist'
import '@fontsource-variable/geist-mono'
import './index.css'
import App from './App.tsx'
import { registerSW } from 'virtual:pwa-register'

registerSW({ immediate: true })

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
