import { useAuthStore } from '../store/authStore'

/**
 * Получить путь для перенаправления после логина в зависимости от роли пользователя
 */
export function getRedirectPathAfterLogin(): string {
  const getUser = useAuthStore.getState().getUser
  const user = getUser()
  
  if (user?.role === 'user') {
    return '/profile'
  }
  
  return '/dashboard'
}

