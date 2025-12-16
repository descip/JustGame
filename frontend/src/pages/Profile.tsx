import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { authService, paymentService } from '../api/services'
import { OnlinePaymentCreate } from '../api/types'
import { useCurrentUser } from '../hooks/useCurrentUser'
import LoadingSkeleton from '../components/LoadingSkeleton'
import { useToastStore } from '../store/toastStore'
import { getErrorMessage } from '../utils/errorHandler'
import { UserOutlined, DollarOutlined, PlusOutlined, CloseOutlined } from '@ant-design/icons'
import './Profile.css'

export default function Profile() {
  const [showTopUpModal, setShowTopUpModal] = useState(false)
  const [topUpHours, setTopUpHours] = useState(1)
  const queryClient = useQueryClient()
  const showToast = useToastStore((state) => state.showToast)
  const currentUser = useCurrentUser()
  const isUser = currentUser?.role === 'user'

  const { data: profile, isLoading, error } = useQuery({
    queryKey: ['profile'],
    queryFn: authService.getProfile,
  })

  const topUpMutation = useMutation({
    mutationFn: (data: OnlinePaymentCreate) => paymentService.createOnline(data),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['profile'] })
      setShowTopUpModal(false)
      setTopUpHours(1)
      showToast('Платеж создан. Открывается страница оплаты...', 'info', 3000)
      setTimeout(() => {
        if (data.payment_url) {
          window.open(data.payment_url, '_blank')
        }
      }, 2000)
    },
    onError: (error) => {
      showToast(getErrorMessage(error), 'error')
    },
  })

  if (isLoading) {
    return (
      <div className="profile-container">
        <LoadingSkeleton />
      </div>
    )
  }

  if (error) {
    return (
      <div className="profile-container">
        <div className="profile-error">
          Ошибка загрузки профиля. Попробуйте обновить страницу.
        </div>
      </div>
    )
  }

  if (!profile) {
    return null
  }

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'admin':
        return 'Администратор'
      case 'operator':
        return 'Оператор'
      case 'user':
        return 'Пользователь'
      default:
        return role
    }
  }

  const balance = profile.balance
  const isPositive = balance > 0
  const isNegative = balance < 0
  const balanceClass = isPositive ? 'positive' : isNegative ? 'negative' : 'zero'
  const balanceBadgeText = isPositive 
    ? 'Положительный баланс' 
    : 'Нулевой баланс'

  const handleTopUp = (e: React.FormEvent) => {
    e.preventDefault()
    topUpMutation.mutate({ hours: topUpHours })
  }

  return (
    <div className="profile-container">
      {showTopUpModal && (
        <div className="profile-topup-modal-overlay" onClick={() => setShowTopUpModal(false)}>
          <div className="profile-topup-modal" onClick={(e) => e.stopPropagation()}>
            <div className="profile-topup-modal-header">
              <h3 className="profile-topup-modal-title">Пополнить баланс</h3>
              <button
                className="profile-topup-modal-close"
                onClick={() => setShowTopUpModal(false)}
                aria-label="Закрыть"
              >
                <CloseOutlined />
              </button>
            </div>
            <form onSubmit={handleTopUp} className="profile-topup-form">
              <div className="profile-topup-form-group">
                <label htmlFor="topup-hours">Количество часов</label>
                <input
                  id="topup-hours"
                  type="number"
                  min={1}
                  max={24}
                  value={topUpHours}
                  onChange={(e) => setTopUpHours(parseInt(e.target.value) || 1)}
                  required
                  className="profile-topup-input"
                />
                <p className="profile-topup-hint">
                  Выберите количество часов для пополнения баланса
                </p>
              </div>
              <div className="profile-topup-form-actions">
                <button
                  type="button"
                  onClick={() => setShowTopUpModal(false)}
                  className="profile-topup-button-cancel"
                  disabled={topUpMutation.isPending}
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  className="profile-topup-button-submit"
                  disabled={topUpMutation.isPending}
                >
                  {topUpMutation.isPending ? 'Создание...' : 'Пополнить'}
                </button>
              </div>
              {topUpMutation.isError && (
                <div className="profile-topup-error">
                  {getErrorMessage(topUpMutation.error)}
                </div>
              )}
            </form>
          </div>
        </div>
      )}

      <div className="profile-header">
        <h1 className="profile-title">Профиль</h1>
        <p className="profile-subtitle">
          {isUser ? 'Управление личной информацией и балансом' : 'Личная информация'}
        </p>
      </div>

      <div className="profile-content">
        <div className="profile-card">
          <div className="profile-card-header">
            <div className="profile-card-icon">
              <UserOutlined />
            </div>
            <h2 className="profile-card-title">Информация о пользователе</h2>
          </div>
          <div className="profile-card-body">
            <div className="profile-info-row">
              <span className="profile-info-label">Email</span>
              <span className="profile-info-value">{profile.email}</span>
            </div>
            <div className="profile-info-row">
              <span className="profile-info-label">Роль</span>
              <span className="profile-info-value">
                <span className="profile-role-badge">{getRoleLabel(profile.role)}</span>
              </span>
            </div>
          </div>
        </div>

        {isUser && (
          <div className="profile-card profile-card-balance">
            <div className="profile-card-header">
              <div className="profile-card-icon">
                <DollarOutlined />
              </div>
              <h2 className="profile-card-title">Баланс</h2>
            </div>
            <div className="profile-card-body">
              <div className="profile-balance-wrapper">
                <div className={`profile-balance-amount ${balanceClass}`}>
                  {balance.toFixed(2)} ₽
                </div>
                <div className="profile-balance-description">
                  Доступно для использования
                </div>
                {isNegative ? (
                  <button
                    onClick={() => setShowTopUpModal(true)}
                    className="profile-topup-button"
                  >
                    <PlusOutlined />
                    Пополнить баланс
                  </button>
                ) : (
                  <div className={`profile-balance-badge ${balanceClass}`}>
                    {balanceBadgeText}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

