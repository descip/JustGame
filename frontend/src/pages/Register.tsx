import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import { authService } from '../api/services'
import { Role } from '../api/types'
import { getErrorMessage } from '../utils/errorHandler'
import './Register.css'

export default function Register() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (password !== confirmPassword) {
      setError('Пароли не совпадают')
      return
    }

    if (password.length < 6) {
      setError('Пароль должен содержать минимум 6 символов')
      return
    }

    setLoading(true)

    try {
      await authService.register({ email, password, role: Role.user })
      setError('')
      // После регистрации перенаправляем на страницу входа
      navigate('/login', { state: { message: 'Регистрация успешна! Войдите в систему.' } })
    } catch (err) {
      setError(getErrorMessage(err) || 'Ошибка регистрации. Попробуйте снова.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="register-container">
      <div className="register-card">
        <div className="register-header">
          <h1 className="register-title">JUSTGAME CONTROL</h1>
          <p className="register-subtitle">Регистрация нового пользователя</p>
        </div>
        <form onSubmit={handleSubmit} className="register-form">
          {error && <div className="register-error">{error}</div>}
          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={loading}
              placeholder="user@example.com"
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
              minLength={6}
            />
          </div>
          <div className="form-group">
            <label htmlFor="confirmPassword">Подтвердите пароль</label>
            <input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              disabled={loading}
              placeholder="••••••••"
              minLength={6}
            />
          </div>
          <button
            type="submit"
            className="register-button"
            disabled={loading}
          >
            {loading ? 'Регистрация...' : 'Зарегистрироваться'}
          </button>
          <div className="register-footer">
            <span>Уже есть аккаунт?</span>
            <Link to="/login" className="register-link">
              Войти
            </Link>
          </div>
        </form>
      </div>
    </div>
  )
}
