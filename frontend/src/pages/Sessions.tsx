import { useState, useMemo, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { sessionService, machineService } from '../api/services'
import { SessionStartIn } from '../api/types'
import { useToastStore } from '../store/toastStore'
import { useCurrentUser } from '../hooks/useCurrentUser'
import LoadingSkeleton from '../components/LoadingSkeleton'
import ConfirmDialog from '../components/ConfirmDialog'
import Pagination from '../components/Pagination'
import { getErrorMessage } from '../utils/errorHandler'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import './Sessions.css'

dayjs.extend(relativeTime)

export default function Sessions() {
  const [showStartForm, setShowStartForm] = useState(false)
  const [newSession, setNewSession] = useState<SessionStartIn>({
    user_id: 1,
    machine_id: 1,
    hours: 1,
  })
  const [extendSessionId, setExtendSessionId] = useState<number | null>(null)
  const [extendHours, setExtendHours] = useState(1)
  const [searchQuery, setSearchQuery] = useState('')
  const [stopConfirmId, setStopConfirmId] = useState<number | null>(null)
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null)
  const [activePage, setActivePage] = useState(1)
  const [endedPage, setEndedPage] = useState(1)
  const [activeItemsPerPage, setActiveItemsPerPage] = useState(5)
  const [endedItemsPerPage, setEndedItemsPerPage] = useState(5)
  const queryClient = useQueryClient()
  const showToast = useToastStore((state) => state.showToast)
  const user = useCurrentUser()

  const { data: sessions = [], isLoading } = useQuery({
    queryKey: ['sessions'],
    queryFn: sessionService.list,
    refetchInterval: 30000, // Auto-refresh every 30 seconds
  })

  const { data: machines = [] } = useQuery({
    queryKey: ['machines'],
    queryFn: machineService.list,
  })

  const getMachineName = (machineId: number): string => {
    const machine = machines.find((m) => m.id === machineId)
    return machine ? machine.name : `Машина #${machineId}`
  }

  const startMutation = useMutation({
    mutationFn: sessionService.start,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sessions'] })
      queryClient.invalidateQueries({ queryKey: ['machines'] })
      setShowStartForm(false)
      setNewSession({ user_id: 1, machine_id: 1, hours: 1 })
      showToast('Сессия успешно запущена', 'success')
    },
    onError: (error) => {
      showToast(getErrorMessage(error), 'error')
    },
  })

  const stopMutation = useMutation({
    mutationFn: sessionService.stop,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['sessions'] })
      queryClient.invalidateQueries({ queryKey: ['machines'] })
      setStopConfirmId(null)
      showToast(
        `Сессия остановлена. Стоимость: ${data.amount.toFixed(2)} ₽`,
        'success',
        6000
      )
    },
    onError: (error) => {
      setStopConfirmId(null)
      showToast(getErrorMessage(error), 'error')
    },
  })

  const extendMutation = useMutation({
    mutationFn: ({ id, hours }: { id: number; hours: number }) =>
      sessionService.extend(id, hours),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sessions'] })
      setExtendSessionId(null)
      setExtendHours(1)
      showToast('Сессия успешно продлена', 'success')
    },
    onError: (error) => {
      showToast(getErrorMessage(error), 'error')
    },
  })

  const deleteMutation = useMutation({
    mutationFn: sessionService.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sessions'] })
      setDeleteConfirmId(null)
      showToast('Сессия удалена', 'success')
    },
    onError: (error) => {
      setDeleteConfirmId(null)
      showToast(getErrorMessage(error), 'error')
    },
  })

  const handleStartSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    startMutation.mutate(newSession)
  }

  const handleStop = (id: number) => {
    setStopConfirmId(id)
  }

  const handleDelete = (id: number) => {
    setDeleteConfirmId(id)
  }

  const handleExtend = (id: number) => {
    if (extendHours < 1 || extendHours > 24) {
      showToast('Количество часов должно быть от 1 до 24', 'warning')
      return
    }
    extendMutation.mutate({ id, hours: extendHours })
  }

  const getRemainingTime = (autoEndAt: string | null): string => {
    if (!autoEndAt) return '-'
    const remaining = dayjs(autoEndAt).diff(dayjs(), 'minute')
    if (remaining <= 0) return 'Истекло'
    const hours = Math.floor(remaining / 60)
    const minutes = remaining % 60
    return `${hours}ч ${minutes}м`
  }

  const filteredSessions = sessions.filter((session) => {
    const matchesSearch =
      session.id.toString().includes(searchQuery) ||
      session.user_id.toString().includes(searchQuery) ||
      session.machine_id.toString().includes(searchQuery) ||
      getMachineName(session.machine_id).toLowerCase().includes(searchQuery.toLowerCase())
    return matchesSearch
  })

  const activeSessions = filteredSessions.filter((s) => !s.ended_at)
  const endedSessions = filteredSessions.filter((s) => s.ended_at)

  // Пагинация для активных сессий
  const activeTotalPages = Math.ceil(activeSessions.length / activeItemsPerPage)
  const paginatedActiveSessions = useMemo(() => {
    const start = (activePage - 1) * activeItemsPerPage
    const end = start + activeItemsPerPage
    return activeSessions.slice(start, end)
  }, [activeSessions, activePage, activeItemsPerPage])

  // Пагинация для завершенных сессий
  const endedTotalPages = Math.ceil(endedSessions.length / endedItemsPerPage)
  const paginatedEndedSessions = useMemo(() => {
    const start = (endedPage - 1) * endedItemsPerPage
    const end = start + endedItemsPerPage
    return endedSessions.slice(start, end)
  }, [endedSessions, endedPage, endedItemsPerPage])

  // Сброс страницы при изменении поискового запроса
  useEffect(() => {
    setActivePage(1)
    setEndedPage(1)
  }, [searchQuery])

  // Проверяем, является ли пользователь admin или operator
  const isAdminOrOperator = user?.role === 'admin' || user?.role === 'operator'

  return (
    <div className="sessions-page">
      <ConfirmDialog
        isOpen={stopConfirmId !== null}
        title="Остановить сессию?"
        message="Вы уверены, что хотите остановить эту сессию? Будет произведен расчет стоимости."
        confirmText="Остановить"
        cancelText="Отмена"
        type="warning"
        onConfirm={() => {
          if (stopConfirmId !== null) {
            stopMutation.mutate(stopConfirmId)
          }
        }}
        onCancel={() => setStopConfirmId(null)}
      />
      <ConfirmDialog
        isOpen={deleteConfirmId !== null}
        title="Удалить сессию?"
        message="Вы уверены, что хотите удалить эту завершенную сессию? Это действие нельзя отменить."
        confirmText="Удалить"
        cancelText="Отмена"
        type="danger"
        onConfirm={() => {
          if (deleteConfirmId !== null) {
            deleteMutation.mutate(deleteConfirmId)
          }
        }}
        onCancel={() => setDeleteConfirmId(null)}
      />
      <div className="page-section">
        <h2 className="page-title">Игровые сессии</h2>
        <p className="page-description">
          Управляйте игровыми сессиями пользователей. Запускайте, останавливайте
          и продлевайте сессии.
        </p>
        {!isLoading && sessions.length > 0 && (
          <div className="sessions-search">
            <input
              type="text"
              placeholder="Поиск по ID сессии, пользователю, машине..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="search-input"
            />
          </div>
        )}
        {isLoading ? (
          <div className="sessions-list">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="session-card">
                <LoadingSkeleton height="1.5rem" width="40%" className="skeleton-title" />
                <LoadingSkeleton height="1rem" count={4} className="skeleton-text" />
              </div>
            ))}
          </div>
        ) : (
          <>
            {activeSessions.length > 0 && (
              <div className="sessions-section">
                <h3 className="sessions-section-title">
                  Активные сессии ({activeSessions.length})
                </h3>
                <div className="sessions-list">
                  {paginatedActiveSessions.map((session) => (
                    <div key={session.id} className="session-card active">
                      <div className="session-header">
                        <div>
                          <span className="session-id">Сессия #{session.id}</span>
                          <span className="session-label">
                            Пользователь ID: {session.user_id} | {getMachineName(session.machine_id)}
                          </span>
                        </div>
                        <span className="session-status active">Активна</span>
                      </div>
                      <div className="session-info">
                        <div className="session-info-row">
                          <div className="session-info-item">
                            <span className="session-info-label">Начало:</span>
                            <span className="session-info-value">
                              {dayjs(session.started_at).format('DD.MM.YYYY HH:mm')}
                            </span>
                          </div>
                          <div className="session-info-item">
                            <span className="session-info-label">Оплачено минут:</span>
                            <span className="session-info-value">{session.paid_minutes}</span>
                          </div>
                        </div>
                        {session.auto_end_at && (
                          <div className="session-info-row">
                            <div className="session-info-item">
                              <span className="session-info-label">Авто-завершение:</span>
                              <span className="session-info-value">
                                {dayjs(session.auto_end_at).format('DD.MM.YYYY HH:mm')}
                              </span>
                            </div>
                            <div className="session-info-item">
                              <span className="session-info-label">Осталось времени:</span>
                              <span className="session-info-value remaining-time">
                                {getRemainingTime(session.auto_end_at)}
                              </span>
                            </div>
                          </div>
                        )}
                      </div>
                      <div className="session-actions">
                        {extendSessionId === session.id ? (
                          <div className="extend-form">
                            <input
                              type="number"
                              min={1}
                              max={24}
                              value={extendHours}
                              onChange={(e) =>
                                setExtendHours(parseInt(e.target.value) || 1)
                              }
                              className="extend-input"
                            />
                            <button
                              onClick={() => handleExtend(session.id)}
                              className="button-secondary"
                              disabled={extendMutation.isPending}
                            >
                              Продлить
                            </button>
                            <button
                              onClick={() => setExtendSessionId(null)}
                              className="button-secondary"
                            >
                              Отмена
                            </button>
                          </div>
                        ) : (
                          <>
                            <button
                              onClick={() => setExtendSessionId(session.id)}
                              className="button-secondary"
                            >
                              Продлить
                            </button>
                            <button
                              onClick={() => handleStop(session.id)}
                              className="button-danger"
                              disabled={stopMutation.isPending}
                            >
                              Остановить
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
                {activeSessions.length > activeItemsPerPage && (
                  <Pagination
                    currentPage={activePage}
                    totalPages={activeTotalPages}
                    itemsPerPage={activeItemsPerPage}
                    totalItems={activeSessions.length}
                    onPageChange={setActivePage}
                    onItemsPerPageChange={setActiveItemsPerPage}
                  />
                )}
              </div>
            )}

            {endedSessions.length > 0 && (
              <div className="sessions-section">
                <h3 className="sessions-section-title">
                  Завершенные сессии ({endedSessions.length})
                </h3>
                <div className="sessions-list">
                  {paginatedEndedSessions.map((session) => (
                    <div key={session.id} className="session-card ended">
                      <div className="session-header">
                        <div>
                          <span className="session-id">Сессия #{session.id}</span>
                          <span className="session-label">
                            Пользователь ID: {session.user_id} | {getMachineName(session.machine_id)}
                          </span>
                        </div>
                        <span className="session-status ended">Завершена</span>
                      </div>
                      <div className="session-info">
                        <div className="session-info-row">
                          <div className="session-info-item">
                            <span className="session-info-label">Начало:</span>
                            <span className="session-info-value">
                              {dayjs(session.started_at).format('DD.MM.YYYY HH:mm')}
                            </span>
                          </div>
                          <div className="session-info-item">
                            <span className="session-info-label">Конец:</span>
                            <span className="session-info-value">
                              {session.ended_at
                                ? dayjs(session.ended_at).format('DD.MM.YYYY HH:mm')
                                : '-'}
                            </span>
                          </div>
                        </div>
                        <div className="session-info-row">
                          <div className="session-info-item">
                            <span className="session-info-label">Оплачено минут:</span>
                            <span className="session-info-value">{session.paid_minutes}</span>
                          </div>
                          <div className="session-info-item">
                            <span className="session-info-label">Стоимость:</span>
                            <span className="session-info-value amount">
                              {session.amount.toFixed(2)} ₽
                            </span>
                          </div>
                        </div>
                      </div>
                      {isAdminOrOperator && (
                        <div className="session-actions">
                          <button
                            onClick={() => handleDelete(session.id)}
                            className="button-danger"
                            disabled={deleteMutation.isPending}
                          >
                            Удалить
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
                {endedSessions.length > endedItemsPerPage && (
                  <Pagination
                    currentPage={endedPage}
                    totalPages={endedTotalPages}
                    itemsPerPage={endedItemsPerPage}
                    totalItems={endedSessions.length}
                    onPageChange={setEndedPage}
                    onItemsPerPageChange={setEndedItemsPerPage}
                  />
                )}
              </div>
            )}

            {sessions.length === 0 && (
              <div className="empty-state">
                Нет активных сессий. Запустите новую сессию ниже.
              </div>
            )}
          </>
        )}
      </div>

      <div className="page-section">
        <h2 className="page-title">Запустить сессию</h2>
        <p className="page-description">
          Запустите новую игровую сессию для пользователя. Доступно только для
          ролей admin / operator.
        </p>
        {showStartForm ? (
          <form onSubmit={handleStartSubmit} className="start-session-form">
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="session-user-id">ID Пользователя</label>
                <input
                  id="session-user-id"
                  type="number"
                  value={newSession.user_id}
                  onChange={(e) =>
                    setNewSession({
                      ...newSession,
                      user_id: parseInt(e.target.value) || 1,
                    })
                  }
                  required
                  min={1}
                />
              </div>
              <div className="form-group">
                <label htmlFor="session-machine-id">Машина</label>
                <select
                  id="session-machine-id"
                  value={newSession.machine_id}
                  onChange={(e) =>
                    setNewSession({
                      ...newSession,
                      machine_id: parseInt(e.target.value) || 1,
                    })
                  }
                  required
                >
                  {machines.length === 0 ? (
                    <option value="">Загрузка машин...</option>
                  ) : machines.filter((m) => m.status === 'available').length === 0 ? (
                    <option value="">Нет доступных машин</option>
                  ) : (
                    machines
                      .filter((m) => m.status === 'available')
                      .map((machine) => (
                        <option key={machine.id} value={machine.id}>
                          {machine.name} ({machine.zone})
                        </option>
                      ))
                  )}
                </select>
              </div>
              <div className="form-group">
                <label htmlFor="session-hours">Часы</label>
                <input
                  id="session-hours"
                  type="number"
                  value={newSession.hours}
                  onChange={(e) =>
                    setNewSession({
                      ...newSession,
                      hours: parseInt(e.target.value) || 1,
                    })
                  }
                  required
                  min={1}
                  max={24}
                />
              </div>
            </div>
            <div className="form-actions">
              <button
                type="button"
                onClick={() => {
                  setShowStartForm(false)
                  setNewSession({ user_id: 1, machine_id: 1, hours: 1 })
                }}
                className="button-secondary"
              >
                Отмена
              </button>
              <button
                type="submit"
                disabled={startMutation.isPending}
                className="button-primary"
              >
                {startMutation.isPending ? 'Запуск...' : 'Запустить сессию'}
              </button>
            </div>
            {startMutation.isError && (
              <div className="error-message">
                {getErrorMessage(startMutation.error)}
              </div>
            )}
            {extendMutation.isError && (
              <div className="error-message">
                {getErrorMessage(extendMutation.error)}
              </div>
            )}
            {stopMutation.isError && (
              <div className="error-message">
                {getErrorMessage(stopMutation.error)}
              </div>
            )}
            {deleteMutation.isError && (
              <div className="error-message">
                {getErrorMessage(deleteMutation.error)}
              </div>
            )}
          </form>
        ) : (
          <button
            onClick={() => setShowStartForm(true)}
            className="button-primary"
          >
            Запустить сессию
          </button>
        )}
      </div>
    </div>
  )
}
