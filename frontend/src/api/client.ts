const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8000'

export type ApiError = {
  status: number
  message: string
  details?: unknown
}

const TOKEN_KEY = 'access_token'

export function getToken() {
  return localStorage.getItem(TOKEN_KEY)
}

export function setToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token)
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY)
}

type ApiFetchOptions = RequestInit & {
  auth?: boolean
}

export async function apiFetch<T>(
  path: string,
  options: ApiFetchOptions = {},
): Promise<T> {
  const headers = new Headers(options.headers)
  const body = options.body

  const isForm =
    body instanceof FormData ||
    body instanceof URLSearchParams ||
    body instanceof Blob

  if (body && !isForm && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }

  if (options.auth !== false) {
    const token = getToken()
    if (token) headers.set('Authorization', `Bearer ${token}`)
  }

  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers,
  })

  if (!res.ok) {
    let details: unknown = null
    const contentType = res.headers.get('content-type') ?? ''

    if (contentType.includes('application/json')) {
      details = await res.json().catch(() => null)
    } else {
      details = await res.text().catch(() => null)
    }

    const message =
      typeof details === 'string' && details
        ? details
        : ((details as { detail?: string })?.detail ?? res.statusText)

    throw { status: res.status, message, details } as ApiError
  }

  if (res.status === 204) return undefined as T

  const contentType = res.headers.get('content-type') ?? ''
  if (contentType.includes('application/json')) {
    return (await res.json()) as T
  }

  return (await res.text()) as unknown as T
}
