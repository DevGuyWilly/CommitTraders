import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import { App } from './App'
import { hideSplash } from './lib/splash'

// Pages hide the splash once their first data arrives; this is the backstop so
// it can never be left covering the app (a route with no data, a hung request).
window.setTimeout(hideSplash, 6000)

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>
)
