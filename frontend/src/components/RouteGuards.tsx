import { Navigate } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'

/**
 * Защищает маршрут, требуя аутентификации
 */
export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const token = useAuthStore((state) => state.token)
  
  if (!token) {
    return <Navigate to="/login" replace />
  }
  
  return <>{children}</>
}

/**
 * Перенаправляет пользователя в зависимости от роли
 */
export function RoleBasedRedirect() {
  const getUser = useAuthStore((state) => state.getUser)
  const user = getUser()
  
  if (user?.role === 'user') {
    return <Navigate to="/profile" replace />
  }
  
  return <Navigate to="/dashboard" replace />
}

/**
 * Защищает маршрут, требуя роль admin или operator
 */
export function AdminRoute({ children }: { children: React.ReactNode }) {
  const getUser = useAuthStore((state) => state.getUser)
  const user = getUser()
  
  if (user?.role === 'user') {
    return <Navigate to="/profile" replace />
  }
  
  return <>{children}</>
}

/**
 * Защищает маршрут, требуя роль operator
 */
export function OperatorRoute({ children }: { children: React.ReactNode }) {
  const getUser = useAuthStore((state) => state.getUser)
  const user = getUser()
  
  if (user?.role !== 'operator') {
    return <Navigate to="/dashboard" replace />
  }
  
  return <>{children}</>
}

