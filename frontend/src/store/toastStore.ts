import { create } from 'zustand'
import { Toast, ToastType } from '../components/Toast'

interface ToastStore {
  toasts: Toast[]
  showToast: (message: string, type?: ToastType, duration?: number) => void
  removeToast: (id: string) => void
}

export const useToastStore = create<ToastStore>((set) => ({
  toasts: [],
  showToast: (message, type = 'info', duration = 5000) => {
    const id = Math.random().toString(36).substring(7)
    const toast: Toast = { id, message, type, duration }
    set((state) => ({ toasts: [...state.toasts, toast] }))
  },
  removeToast: (id) => {
    set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) }))
  },
}))

