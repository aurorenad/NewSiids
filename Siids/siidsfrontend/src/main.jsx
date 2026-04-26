import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { CssBaseline, ThemeProvider } from '@mui/material'
import './index.css'
import './theme/mdc.css'
import App from './App.jsx'
import { mdcTheme } from './theme/mdcTheme'

createRoot(document.getElementById('root')).render(
    <StrictMode>
        <ThemeProvider theme={mdcTheme}>
            <CssBaseline />
            <App />
        </ThemeProvider>
    </StrictMode>,
)