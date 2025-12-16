import { useAuthStore } from '../store/authStore'

/**
 * Хук для получения текущего пользователя
 */
export function useCurrentUser() {
  const getUser = useAuthStore((state) => state.getUser)
  return getUser()
}

