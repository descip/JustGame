import { useState, useMemo, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { paymentService } from '../api/services'
import { Payment, PaymentMethod, PaymentStatus, CashPaymentCreate, OnlinePaymentCreate } from '../api/types'
import { useToastStore } from '../store/toastStore'
import { getErrorMessage } from '../utils/errorHandler'
import LoadingSkeleton from '../components/LoadingSkeleton'
import Pagination from '../components/Pagination'
import dayjs from 'dayjs'
import './Payments.css'

export default function Payments() {
  const [showCashForm, setShowCashForm] = useState(false)
  const [showOnlineForm, setShowOnlineForm] = useState(false)
  const [newCashPayment, setNewCashPayment] = useState<CashPaymentCreate>({
    user_id: 1,
    hours: 1,
    note: '',
  })
  const [newOnlinePayment, setNewOnlinePayment] = useState<OnlinePaymentCreate>({
    hours: 1,
  })
  const [paymentUrl, setPaymentUrl] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState<PaymentStatus | 'all'>('all')
  const [methodFilter, setMethodFilter] = useState<PaymentMethod | 'all'>('all')
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(5)
  const queryClient = useQueryClient()
  const showToast = useToastStore((state) => state.showToast)

  const { data: payments = [], isLoading } = useQuery({
    queryKey: ['payments'],
    queryFn: paymentService.list,
  })

  const filteredPayments = payments.filter((payment) => {
    const matchesStatus = statusFilter === 'all' || payment.status === statusFilter
    const matchesMethod = methodFilter === 'all' || payment.method === methodFilter
    return matchesStatus && matchesMethod
  })

  // Пагинация для платежей
  const totalPages = Math.ceil(filteredPayments.length / itemsPerPage)
  const paginatedPayments = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage
    const end = start + itemsPerPage
    return filteredPayments.slice(start, end)
  }, [filteredPayments, currentPage, itemsPerPage])

  // Сброс страницы при изменении фильтров
  useEffect(() => {
    setCurrentPage(1)
  }, [statusFilter, methodFilter])

  const cashMutation = useMutation({
    mutationFn: paymentService.createCash,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payments'] })
      setShowCashForm(false)
      setNewCashPayment({ user_id: 1, hours: 1, note: '' })
      showToast('Наличный платеж успешно создан', 'success')
    },
    onError: (error) => {
      showToast(getErrorMessage(error), 'error')
    },
  })

  const onlineMutation = useMutation({
    mutationFn: paymentService.createOnline,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['payments'] })
      setShowOnlineForm(false)
      setNewOnlinePayment({ hours: 1 })
      setPaymentUrl(data.payment_url)
      showToast('Онлайн платеж создан. Открывается страница оплаты...', 'info', 3000)
      setTimeout(() => {
        if (data.payment_url) {
          window.open(data.payment_url, '_blank')
        }
        setPaymentUrl(null)
      }, 2000)
    },
    onError: (error) => {
      showToast(getErrorMessage(error), 'error')
    },
  })

  const getStatusLabel = (status: PaymentStatus) => {
    switch (status) {
      case PaymentStatus.created:
        return 'Создан'
      case PaymentStatus.pending:
        return 'Ожидает'
      case PaymentStatus.succeeded:
        return 'Успешно'
      case PaymentStatus.failed:
        return 'Ошибка'
      default:
        return status
    }
  }

  const getStatusClass = (status: PaymentStatus) => {
    switch (status) {
      case PaymentStatus.succeeded:
        return 'status-success'
      case PaymentStatus.pending:
        return 'status-pending'
      case PaymentStatus.failed:
        return 'status-failed'
      default:
        return 'status-created'
    }
  }

  const getMethodLabel = (method: PaymentMethod) => {
    return method === PaymentMethod.cash ? 'Наличные' : 'Онлайн'
  }

  const totalAmount = filteredPayments
    .filter((p) => p.status === PaymentStatus.succeeded)
    .reduce((sum, p) => sum + p.amount, 0)

  return (
    <div className="payments-page">
      <div className="page-section">
        <h2 className="page-title">Платежи</h2>
        <p className="page-description">
          Управление платежами пользователей. Создавайте наличные платежи и отслеживайте онлайн платежи.
        </p>

        <div className="payments-filters">
          <div className="filter-group">
            <label>Статус</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as PaymentStatus | 'all')}
              className="filter-select"
            >
              <option value="all">Все</option>
              <option value={PaymentStatus.created}>Создан</option>
              <option value={PaymentStatus.pending}>Ожидает</option>
              <option value={PaymentStatus.succeeded}>Успешно</option>
              <option value={PaymentStatus.failed}>Ошибка</option>
            </select>
          </div>
          <div className="filter-group">
            <label>Метод</label>
            <select
              value={methodFilter}
              onChange={(e) => setMethodFilter(e.target.value as PaymentMethod | 'all')}
              className="filter-select"
            >
              <option value="all">Все</option>
              <option value={PaymentMethod.cash}>Наличные</option>
              <option value={PaymentMethod.online}>Онлайн</option>
            </select>
          </div>
          <div className="payments-summary">
            <span className="summary-label">Всего успешных:</span>
            <span className="summary-value">{totalAmount.toFixed(2)} ₽</span>
          </div>
        </div>

        {isLoading ? (
          <div className="payments-list">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="payment-card">
                <LoadingSkeleton height="1.5rem" width="40%" className="skeleton-title" />
                <LoadingSkeleton height="1rem" count={4} className="skeleton-text" />
              </div>
            ))}
          </div>
        ) : filteredPayments.length === 0 ? (
          <div className="empty-state">Платежи не найдены</div>
        ) : (
          <>
            <div className="payments-list">
              {paginatedPayments.map((payment) => (
              <div key={payment.id} className="payment-card">
                <div className="payment-header">
                  <div>
                    <span className="payment-id">Платеж #{payment.id}</span>
                    <span className="payment-method">{getMethodLabel(payment.method)}</span>
                  </div>
                  <span className={`payment-status ${getStatusClass(payment.status)}`}>
                    {getStatusLabel(payment.status)}
                  </span>
                </div>
                <div className="payment-info">
                  <div className="payment-info-row">
                    <div className="payment-info-item">
                      <span className="payment-info-label">Пользователь:</span>
                      <span className="payment-info-value">ID {payment.user_id}</span>
                    </div>
                    <div className="payment-info-item">
                      <span className="payment-info-label">Сумма:</span>
                      <span className="payment-info-value amount">{payment.amount.toFixed(2)} ₽</span>
                    </div>
                  </div>
                  <div className="payment-info-row">
                    <div className="payment-info-item">
                      <span className="payment-info-label">Часы:</span>
                      <span className="payment-info-value">{payment.hours}</span>
                    </div>
                    <div className="payment-info-item">
                      <span className="payment-info-label">Дата:</span>
                      <span className="payment-info-value">
                        {dayjs(payment.created_at).format('DD.MM.YYYY HH:mm')}
                      </span>
                    </div>
                  </div>
                  {payment.note && (
                    <div className="payment-note">{payment.note}</div>
                  )}
                </div>
              </div>
              ))}
            </div>
            {filteredPayments.length > itemsPerPage && (
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                itemsPerPage={itemsPerPage}
                totalItems={filteredPayments.length}
                onPageChange={setCurrentPage}
                onItemsPerPageChange={setItemsPerPage}
              />
            )}
          </>
        )}
      </div>

      {/* Форма создания наличного платежа */}
      <div className="page-section">
        <h2 className="page-title">Создать наличный платеж</h2>
        <p className="page-description">
          Создайте наличный платеж для пользователя. Доступно только для ролей admin / operator.
        </p>
        {showCashForm ? (
          <form
            onSubmit={(e) => {
              e.preventDefault()
              cashMutation.mutate(newCashPayment)
            }}
            className="payment-form"
          >
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="cash-user-id">ID Пользователя</label>
                <input
                  id="cash-user-id"
                  type="number"
                  value={newCashPayment.user_id}
                  onChange={(e) =>
                    setNewCashPayment({
                      ...newCashPayment,
                      user_id: parseInt(e.target.value) || 1,
                    })
                  }
                  required
                  min={1}
                />
              </div>
              <div className="form-group">
                <label htmlFor="cash-hours">Часы</label>
                <input
                  id="cash-hours"
                  type="number"
                  value={newCashPayment.hours}
                  onChange={(e) =>
                    setNewCashPayment({
                      ...newCashPayment,
                      hours: parseInt(e.target.value) || 1,
                    })
                  }
                  required
                  min={1}
                  max={24}
                />
              </div>
            </div>
            <div className="form-group">
              <label htmlFor="cash-note">Примечание (необязательно)</label>
              <textarea
                id="cash-note"
                value={newCashPayment.note || ''}
                onChange={(e) =>
                  setNewCashPayment({ ...newCashPayment, note: e.target.value })
                }
                rows={3}
                className="textarea-input"
              />
            </div>
            <div className="form-actions">
              <button
                type="button"
                onClick={() => {
                  setShowCashForm(false)
                  setNewCashPayment({ user_id: 1, hours: 1, note: '' })
                }}
                className="button-secondary"
              >
                Отмена
              </button>
              <button
                type="submit"
                disabled={cashMutation.isPending}
                className="button-primary"
              >
                {cashMutation.isPending ? 'Создание...' : 'Создать платеж'}
              </button>
            </div>
            {cashMutation.isError && (
              <div className="error-message">
                {getErrorMessage(cashMutation.error) || 'Ошибка при создании платежа'}
              </div>
            )}
          </form>
        ) : (
          <button
            onClick={() => setShowCashForm(true)}
            className="button-primary"
          >
            Создать наличный платеж
          </button>
        )}
      </div>

      {/* Форма создания онлайн платежа */}
      <div className="page-section">
        <h2 className="page-title">Создать онлайн платеж</h2>
        <p className="page-description">
          Создайте онлайн платеж для пополнения баланса. После создания вы будете перенаправлены на страницу оплаты.
        </p>
        {showOnlineForm ? (
          <form
            onSubmit={(e) => {
              e.preventDefault()
              onlineMutation.mutate(newOnlinePayment)
            }}
            className="payment-form"
          >
            <div className="form-group">
              <label htmlFor="online-hours">Часы</label>
              <input
                id="online-hours"
                type="number"
                value={newOnlinePayment.hours}
                onChange={(e) =>
                  setNewOnlinePayment({
                    ...newOnlinePayment,
                    hours: parseInt(e.target.value) || 1,
                  })
                }
                required
                min={1}
                max={24}
              />
            </div>
            <div className="form-actions">
              <button
                type="button"
                onClick={() => {
                  setShowOnlineForm(false)
                  setNewOnlinePayment({ hours: 1 })
                }}
                className="button-secondary"
              >
                Отмена
              </button>
              <button
                type="submit"
                disabled={onlineMutation.isPending}
                className="button-primary"
              >
                {onlineMutation.isPending ? 'Создание...' : 'Создать онлайн платеж'}
              </button>
            </div>
            {onlineMutation.isError && (
              <div className="error-message">
                {getErrorMessage(onlineMutation.error) || 'Ошибка при создании платежа'}
              </div>
            )}
            {paymentUrl && (
              <div className="payment-url-info">
                <p>Ссылка на оплату:</p>
                <a href={paymentUrl} target="_blank" rel="noopener noreferrer" className="payment-link">
                  {paymentUrl}
                </a>
              </div>
            )}
          </form>
        ) : (
          <button
            onClick={() => setShowOnlineForm(true)}
            className="button-primary"
          >
            Создать онлайн платеж
          </button>
        )}
      </div>
    </div>
  )
}

