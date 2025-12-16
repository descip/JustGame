export interface JWTPayload {
  sub: string
  role: string
  exp?: number
}

export function decodeJWT(token: string): JWTPayload | null {
  try {
    const base64Url = token.split('.')[1]
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/')
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    )
    return JSON.parse(jsonPayload)
  } catch (error) {
    return null
  }
}

export function getCurrentUser(token: string | null): { email: string; role: string } | null {
  if (!token) return null
  const payload = decodeJWT(token)
  if (!payload || !payload.sub) return null
  return {
    email: payload.sub,
    role: payload.role || 'user',
  }
}

