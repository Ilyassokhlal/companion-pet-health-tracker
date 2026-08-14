import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { BrowserRouter } from 'react-router-dom'
import { AuthProvider } from './auth/AuthContext.tsx'
import { PetProvider } from './context/PetContext.tsx'

createRoot(document.getElementById('root')!).render(
<StrictMode>
  <BrowserRouter>
    <AuthProvider>
      <PetProvider>
        <App />
      </PetProvider>
    </AuthProvider>
  </BrowserRouter>
</StrictMode>,
)
