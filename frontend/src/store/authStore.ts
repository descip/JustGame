import { create } from 'zustand'
import { getCurrentUser } from '../utils/jwt'

interface AuthState {
  token: string | null
  setToken: (token: string | null) => void
  logout: () => void
  getUser: () => { email: string; role: string } | null
}

export const useAuthStore = create<AuthState>((set, get) => ({
  token: localStorage.getItem('token'),
  setToken: (token: string | null) => {
    if (token) {
      localStorage.setItem('token', token)
    } else {
      localStorage.removeItem('token')
    }
    set({ token })
  },
  logout: () => {
    localStorage.removeItem('token')
    set({ token: null })
  },
  getUser: () => {
    const token = get().token
    return getCurrentUser(token)
  },
}))
