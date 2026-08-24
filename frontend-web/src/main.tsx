import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { BrowserRouter } from 'react-router-dom'
import { AuthProvider } from './auth/AuthContext.tsx'
import { PetProvider } from './context/PetContext.tsx'
import { ThemeProvider } from './theme/ThemeContext.tsx'

createRoot(document.getElementById('root')!).render(
<StrictMode>
  <ThemeProvider>
    <BrowserRouter>
      <AuthProvider>
        <PetProvider>
          <App />
        </PetProvider>
      </AuthProvider>
    </BrowserRouter>
  </ThemeProvider>
</StrictMode>,
)