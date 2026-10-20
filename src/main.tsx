import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'
import ErrorBoundary from './components/ErrorBoundary'
import UpdateToast from './components/UpdateToast'
import { registerOfflineApp } from './lib/offlineApp'
import { startSyncOutbox } from './services/syncOutbox'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
      <UpdateToast />
    </ErrorBoundary>
  </React.StrictMode>,
)

// Reenvía a la base de datos los cambios que no se pudieron guardar (sin red o con el servidor caído).
startSyncOutbox()

// Conserva la aplicación y su motor conversacional local para que, después
// de una primera visita con conexión, KAHY pueda abrir y responder sin red.
registerOfflineApp()
