import React from 'react'
import ReactDOM from 'react-dom/client'

import App from './App'
import * as api from './services/api/browser'
import './styles/globals.css'

if (window) {
    window.api = api.api
}

const root = ReactDOM.createRoot(document.getElementById('root'))
root.render(<App />)
