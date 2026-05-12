import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { Analytics } from '@vercel/analytics/react'
import { SpeedInsights } from '@vercel/speed-insights/react'
// Self-hosted Inter — registers as the family 'Inter'. Three weights used by the
// design system: 400 regular / 500 medium / 600 semibold. Bundled with the app,
// no external request, no FOUT from CDN latency.
import '@fontsource/inter/400.css'
import '@fontsource/inter/500.css'
import '@fontsource/inter/600.css'
import './index.css'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
    <Analytics />
    <SpeedInsights />
  </StrictMode>,
)
