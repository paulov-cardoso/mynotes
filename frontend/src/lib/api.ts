const BASE_URL = '/api'

const TOKEN_KEYS = {
  access: 'access_token',
  refresh: 'refresh_token',
} as const

export const tokenStorage = {
  getAccess: () => localStorage.getItem(TOKEN_KEYS.access),
  getRefresh: () => localStorage.getItem(TOKEN_KEYS.refresh),
  set: (access: string, refresh: string) => {
    localStorage.setItem(TOKEN_KEYS.access, access)
    localStorage.setItem(TOKEN_KEYS.refresh, refresh)
  },
  clear: () => {
    localStorage.removeItem(TOKEN_KEYS.access)
    localStorage.removeItem(TOKEN_KEYS.refresh)
  },
}

async function refreshAccessToken(): Promise<string | null> {
  const refresh = tokenStorage.getRefresh()
  if (!refresh) return null

  const response = await fetch(`${BASE_URL}/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refresh }),
  })

  if (!response.ok) {
    tokenStorage.clear()
    return null
  }

  const data = await response.json()
  localStorage.setItem(TOKEN_KEYS.access, data.access)
  return data.access
}

interface RequestConfigWithRetry extends RequestInit {
  _retry?: boolean
}

export async function apiFetch(
  path: string,
  config: RequestConfigWithRetry = {}
): Promise<Response> {
  const headers = new Headers(config.headers)

  const access = tokenStorage.getAccess()
  if (access) {
    headers.set('Authorization', `Bearer ${access}`)
  }

  if (!(config.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json')
  }

  const response = await fetch(`${BASE_URL}${path}`, {
    ...config,
    headers,
  })

  if (response.status === 401 && !config._retry) {
    const newAccess = await refreshAccessToken()

    if (newAccess) {
      headers.set('Authorization', `Bearer ${newAccess}`)
      return fetch(`${BASE_URL}${path}`, {
        ...config,
        _retry: true,
        headers,
      } as RequestConfigWithRetry)
    }

    window.dispatchEvent(new Event('auth:logout'))
  }

  return response
}

export const api = {
  async get<T>(path: string): Promise<T> {
    const res = await apiFetch(path)
    if (!res.ok) throw new Error(`GET ${path} falhou: ${res.status}`)
    return res.json()
  },

 async post<T>(path: string, body: unknown): Promise<T> {
    const ehFormData = body instanceof FormData
    const res = await apiFetch(path, { method: 'POST', body: ehFormData ? body : JSON.stringify(body) })
    if (!res.ok) throw new Error(`POST ${path} falhou: ${res.status}`)
    return res.json()
  },

  async put<T>(path: string, body: unknown): Promise<T> {
    const res = await apiFetch(path, { method: 'PUT', body: JSON.stringify(body) })
    if (!res.ok) throw new Error(`PUT ${path} falhou: ${res.status}`)
    return res.json()
  },

  async delete<T>(path: string): Promise<T> {
    const res = await apiFetch(path, { method: 'DELETE' })
    if (!res.ok) throw new Error(`DELETE ${path} falhou: ${res.status}`)
    return res.json()
  },
}
