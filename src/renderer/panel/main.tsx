import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@shared/globals.css'
import { Panel } from './Panel'

const rootElement = document.getElementById('root')
if (!rootElement) {
  throw new Error('Root element not found')
}

createRoot(rootElement).render(
  <StrictMode>
    <Panel />
  </StrictMode>
)
