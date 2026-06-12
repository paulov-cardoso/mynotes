import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import { useAuth } from './hooks/useAuth'
import { LoginPage } from './pages/auth/LoginPage'
import { RegistrarPage } from './pages/auth/RegistrarPage'
import { NotesPage } from './pages/NotesPage'
import type { ReactNode } from 'react'
import { SenhaResetPage } from './pages/auth/SenhaResetPage'

function PrivateRoute({ children }: { children: ReactNode }) {
  const { usuario, loading } = useAuth()
  if (loading) return null
  if (!usuario) return <Navigate to="/login" replace />
  return <>{children}</>
}

function AppRoutes() {
  const { usuario, loading } = useAuth()

  if (loading) return null

  return (
    <Routes>
      <Route
        path="/login"
        element={usuario ? <Navigate to="/" replace /> : <LoginPage />}
      />
      <Route
        path="/registrar"
        element={usuario ? <Navigate to="/" replace /> : <RegistrarPage />}
      />
      <Route
        path="/senha/reset"
        element={usuario ? <Navigate to="/" replace /> : <SenhaResetPage />}
      />
      <Route
        path="/"
        element={
          <PrivateRoute>
            <NotesPage />
          </PrivateRoute>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  )
}


