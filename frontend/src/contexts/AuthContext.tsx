import {
  createContext,
  useCallback,
  useEffect,
  useState,
} from 'react'
import type { ReactNode } from 'react'
import { apiFetch, tokenStorage } from '../lib/api'

interface Usuario {
  id: string
  username: string
  nomeExibicao: string
  foto: string | null
}

interface AuthState {
  usuario: Usuario | null
  loading: boolean
}

interface AuthContextValue extends AuthState {
  login:    (username: string, senha: string) => Promise<void>
  registrar: (username: string, nomeExibicao: string, senha: string) => Promise<void>
  logout:   () => Promise<void>
}

export const AuthContext = createContext<AuthContextValue | null>(null)

interface AuthProviderProps {
  children: ReactNode
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [state, setState] = useState<AuthState>({
    usuario: null,
    loading: true,
  })

  const carregarUsuario = useCallback(async () => {
    const token = tokenStorage.getAccess()
    if (!token) {
      setState({ usuario: null, loading: false })
      return
    }

    try {
      const response = await apiFetch('/auth/me')
      if (response.ok) {
        const data = await response.json()
        setState({ usuario: data.usuario, loading: false })
      } else {
        tokenStorage.clear()
        setState({ usuario: null, loading: false })
      }
    } catch {
      tokenStorage.clear()
      setState({ usuario: null, loading: false })
    }
  }, [])

  useEffect(() => {
    carregarUsuario()
  }, [carregarUsuario])

  useEffect(() => {
    const handleForceLogout = () => {
      tokenStorage.clear()
      setState({ usuario: null, loading: false })
    }
    window.addEventListener('auth:logout', handleForceLogout)
    return () => window.removeEventListener('auth:logout', handleForceLogout)
  }, [])

  const login = useCallback(async (username: string, senha: string) => {
    const response = await apiFetch('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, senha }),
    })

    if (!response.ok) {
      const data = await response.json()
      throw new Error(data.error ?? 'Erro ao fazer login.')
    }

    const data = await response.json()
    tokenStorage.set(data.access, data.refresh)
    setState({ usuario: data.usuario, loading: false })
  }, [])

  const registrar = useCallback(async (
    username: string,
    nomeExibicao: string,
    senha: string,
  ) => {
    const response = await apiFetch('/auth/registrar', {
      method: 'POST',
      body: JSON.stringify({ username, nomeExibicao, password1: senha }),
    })

    if (!response.ok) {
      const data = await response.json()
      throw new Error(data.error ?? 'Erro ao criar conta.')
    }

    const data = await response.json()
    tokenStorage.set(data.access, data.refresh)
    setState({ usuario: data.usuario, loading: false })
  }, [])

  const logout = useCallback(async () => {
    try {
      await apiFetch('/auth/logout', { method: 'POST' })
    } finally {
      tokenStorage.clear()
      setState({ usuario: null, loading: false })
    }
  }, [])

  return (
    <AuthContext.Provider value={{ ...state, login, registrar, logout }}>
      {children}
    </AuthContext.Provider>
  )
}
