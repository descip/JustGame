import { useState, useEffect } from 'react'
import { useNavigate, useLocation, Link } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import { authService } from '../api/services'
import { useToastStore } from '../store/toastStore'
import { getErrorMessage } from '../utils/errorHandler'
import { getRedirectPathAfterLogin } from '../utils/navigation'
import './Login.css'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const setToken = useAuthStore((state) => state.setToken)
  const navigate = useNavigate()
  const location = useLocation()
  const showToast = useToastStore((state) => state.showToast)

  useEffect(() => {
    if (location.state?.message) {
      showToast(location.state.message, 'success')
      // Очистить сообщение из state
      window.history.replaceState({}, document.title)
    }
  }, [location, showToast])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const response = await authService.login({ email, password })
      setToken(response.access_token)
      showToast('Успешный вход в систему', 'success')
      
      // Перенаправляем пользователя в зависимости от роли
      const redirectPath = getRedirectPathAfterLogin()
      navigate(redirectPath)
    } catch (err) {
      const errorMessage = getErrorMessage(err) || 'Ошибка входа. Проверьте данные.'
      setError(errorMessage)
      showToast(errorMessage, 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          <h1 className="login-title">JUSTGAME CONTROL</h1>
          <p className="login-subtitle">Управление ПК-клубом</p>
        </div>
        <form onSubmit={handleSubmit} className="login-form">
          {error && <div className="login-error">{error}</div>}
          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={loading}
              placeholder="admin@example.com"
            />
          </div>
          <div className="form-group">
            <label htmlFor="password">Пароль</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={loading}
              placeholder="••••••••"
            />
          </div>
          <button
            type="submit"
            className="login-button"
            disabled={loading}
          >
            {loading ? 'Вход...' : 'Войти'}
          </button>
          <div className="login-footer">
            <span>Нет аккаунта?</span>
            <Link to="/register" className="login-link">
              Зарегистрироваться
            </Link>
          </div>
        </form>
      </div>
    </div>
  )
}

