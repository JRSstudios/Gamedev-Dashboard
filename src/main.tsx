import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './workspace.css'
import './features.css'
import './shell.css'
import './refresh.css'
import './tutorial.css'
import App from './App.tsx'
import { CrashBoundary } from './components/bugs/CrashBoundary'
import { installErrorHandlers } from './features/bugs'

installErrorHandlers()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <CrashBoundary>
      <App />
    </CrashBoundary>
  </StrictMode>,
)
