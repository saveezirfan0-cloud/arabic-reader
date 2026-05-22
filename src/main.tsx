import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'

// Self-hosted fonts via npm — no Google CDN
import '@fontsource/amiri/400.css'
import '@fontsource/amiri/700.css'
import '@fontsource/reem-kufi/500.css'
import '@fontsource-variable/fraunces'

import './styles/globals.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
