import { useState, useMemo, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { bookingService, machineService, authService } from '../api/services'
import { Booking, BookingCreate, BookingStatus, Machine } from '../api/types'
import { useToastStore } from '../store/toastStore'
import { useCurrentUser } from '../hooks/useCurrentUser'
import { getErrorMessage } from '../utils/errorHandler'
import LoadingSkeleton from '../components/LoadingSkeleton'
import ConfirmDialog from '../components/ConfirmDialog'
import Pagination from '../components/Pagination'
import dayjs from 'dayjs'
import './Bookings.css'

export default function Bookings() {
  const user = useCurrentUser()
  const isUser = user?.role === 'user'
  
  const { data: profile } = useQuery({
    queryKey: ['profile'],
    queryFn: authService.getProfile,
    enabled: isUser, // Загружаем профиль только для пользователей
  })

  const [showAddForm, setShowAddForm] = useState(false)
  const [newBooking, setNewBooking] = useState<BookingCreate>({
    user_id: profile?.id || 1,
    machine_id: 1,
    start_at: dayjs().format('YYYY-MM-DDTHH:mm'),
    end_at: dayjs().add(1, 'hour').format('YYYY-MM-DDTHH:mm'),
    note: '',
  })
  const [searchQuery, setSearchQuery] = useState('')
  const [cancelConfirmId, setCancelConfirmId] = useState<number | null>(null)
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null)
  const [activePage, setActivePage] = useState(1)
  const [cancelledPage, setCancelledPage] = useState(1)
  const [activeItemsPerPage, setActiveItemsPerPage] = useState(5)
  const [cancelledItemsPerPage, setCancelledItemsPerPage] = useState(5)
  const queryClient = useQueryClient()
  const showToast = useToastStore((state) => state.showToast)

  const { data: bookings = [], isLoading } = useQuery({
    queryKey: ['bookings'],
    queryFn: bookingService.list,
  })

  const { data: machines = [] } = useQuery({
    queryKey: ['machines'],
    queryFn: machineService.list,
  })

  // Обновляем user_id при загрузке профиля
  useEffect(() => {
    if (isUser && profile?.id) {
      setNewBooking(prev => ({
        ...prev,
        user_id: profile.id
      }))
    }
  }, [isUser, profile?.id])

  const getMachineName = (machineId: number): string => {
    const machine = machines.find((m) => m.id === machineId)
    return machine ? machine.name : `Машина #${machineId}`
  }

  const createMutation = useMutation({
    mutationFn: bookingService.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bookings'] })
      setShowAddForm(false)
      setNewBooking({
        user_id: profile?.id || 1,
        machine_id: 1,
        start_at: dayjs().format('YYYY-MM-DDTHH:mm'),
        end_at: dayjs().add(1, 'hour').format('YYYY-MM-DDTHH:mm'),
        note: '',
      })
      showToast('Бронирование успешно создано', 'success')
    },
    onError: (error) => {
      showToast(getErrorMessage(error), 'error')
    },
  })

  const cancelMutation = useMutation({
    mutationFn: bookingService.cancel,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bookings'] })
      setCancelConfirmId(null)
      showToast('Бронирование отменено', 'success')
    },
    onError: (error) => {
      setCancelConfirmId(null)
      showToast(getErrorMessage(error), 'error')
    },
  })

  const deleteMutation = useMutation({
    mutationFn: bookingService.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bookings'] })
      setDeleteConfirmId(null)
      showToast('Отмененное бронирование удалено', 'success')
    },
    onError: (error) => {
      setDeleteConfirmId(null)
      showToast(getErrorMessage(error), 'error')
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    createMutation.mutate(newBooking)
  }

  const handleCancel = (id: number) => {
    setCancelConfirmId(id)
  }

  const handleDelete = (id: number) => {
    setDeleteConfirmId(id)
  }

  const filteredBookings = bookings.filter((booking) => {
    const matchesSearch =
      booking.id.toString().includes(searchQuery) ||
      booking.machine_id.toString().includes(searchQuery) ||
      booking.user_id.toString().includes(searchQuery) ||
      dayjs(booking.start_at).format('DD.MM.YYYY HH:mm').includes(searchQuery)
    return matchesSearch
  })

  const activeBookings = filteredBookings.filter(
    (b) => b.status === BookingStatus.active
  )
  const cancelledBookings = filteredBookings.filter(
    (b) => b.status === BookingStatus.cancelled
  )

  // Пагинация для активных бронирований
  const activeTotalPages = Math.ceil(activeBookings.length / activeItemsPerPage)
  const paginatedActiveBookings = useMemo(() => {
    const start = (activePage - 1) * activeItemsPerPage
    const end = start + activeItemsPerPage
    return activeBookings.slice(start, end)
  }, [activeBookings, activePage, activeItemsPerPage])

  // Пагинация для отмененных бронирований
  const cancelledTotalPages = Math.ceil(cancelledBookings.length / cancelledItemsPerPage)
  const paginatedCancelledBookings = useMemo(() => {
    const start = (cancelledPage - 1) * cancelledItemsPerPage
    const end = start + cancelledItemsPerPage
    return cancelledBookings.slice(start, end)
  }, [cancelledBookings, cancelledPage, cancelledItemsPerPage])

  // Сброс страницы при изменении поискового запроса
  useEffect(() => {
    setActivePage(1)
    setCancelledPage(1)
  }, [searchQuery])

  return (
    <div className="bookings-page">
      <ConfirmDialog
        isOpen={cancelConfirmId !== null}
        title="Отменить бронирование?"
        message="Вы уверены, что хотите отменить это бронирование? Это действие нельзя отменить."
        confirmText="Отменить"
        cancelText="Нет"
        type="warning"
        onConfirm={() => {
          if (cancelConfirmId !== null) {
            cancelMutation.mutate(cancelConfirmId)
          }
        }}
        onCancel={() => setCancelConfirmId(null)}
      />
      <ConfirmDialog
        isOpen={deleteConfirmId !== null}
        title="Удалить бронирование?"
        message="Вы уверены, что хотите удалить это отмененное бронирование? Это действие нельзя отменить."
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
        <h2 className="page-title">Бронирования</h2>
        <p className="page-description">
          {isUser 
            ? 'Управляйте своими бронированиями. Здесь вы можете создавать новые бронирования и отменять существующие.'
            : 'Управляйте бронированиями машин. Здесь вы можете создавать новые бронирования и отменять существующие.'}
        </p>
        {!isLoading && bookings.length > 0 && (
          <div className="bookings-search">
            <input
              type="text"
              placeholder={isUser ? "Поиск по ID, машине или дате..." : "Поиск по ID, машине, пользователю или дате..."}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="search-input"
            />
          </div>
        )}
        {isLoading ? (
          <div className="bookings-list">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="booking-card">
                <LoadingSkeleton height="1.5rem" width="40%" className="skeleton-title" />
                <LoadingSkeleton height="1rem" count={4} className="skeleton-text" />
              </div>
            ))}
          </div>
        ) : (
          <>
            {activeBookings.length > 0 && (
              <div className="bookings-section">
                <h3 className="bookings-section-title">
                  Активные бронирования ({activeBookings.length})
                </h3>
                <div className="bookings-list">
                  {paginatedActiveBookings.map((booking) => (
                    <div key={booking.id} className="booking-card">
                      <div className="booking-header">
                        <div>
                          <span className="booking-id">#{booking.id}</span>
                          <span className="booking-label">{getMachineName(booking.machine_id)}</span>
                        </div>
                        <span className="booking-status active">Активно</span>
                      </div>
                      <div className="booking-info">
                        {!isUser && (
                          <div className="booking-info-item">
                            <span className="booking-info-label">Пользователь:</span>
                            <span className="booking-info-value">ID {booking.user_id}</span>
                          </div>
                        )}
                        <div className="booking-info-item">
                          <span className="booking-info-label">Начало:</span>
                          <span className="booking-info-value">
                            {dayjs(booking.start_at).format('DD.MM.YYYY HH:mm')}
                          </span>
                        </div>
                        <div className="booking-info-item">
                          <span className="booking-info-label">Конец:</span>
                          <span className="booking-info-value">
                            {dayjs(booking.end_at).format('DD.MM.YYYY HH:mm')}
                          </span>
                        </div>
                        {booking.note && (
                          <div className="booking-note">{booking.note}</div>
                        )}
                      </div>
                      <div className="booking-actions">
                        <button
                          onClick={() => handleCancel(booking.id)}
                          className="button-danger"
                          disabled={cancelMutation.isPending}
                        >
                          Отменить
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
                {activeBookings.length > activeItemsPerPage && (
                  <Pagination
                    currentPage={activePage}
                    totalPages={activeTotalPages}
                    itemsPerPage={activeItemsPerPage}
                    totalItems={activeBookings.length}
                    onPageChange={setActivePage}
                    onItemsPerPageChange={setActiveItemsPerPage}
                  />
                )}
              </div>
            )}

            {cancelledBookings.length > 0 && (
              <div className="bookings-section">
                <h3 className="bookings-section-title">
                  Отмененные бронирования ({cancelledBookings.length})
                </h3>
                <div className="bookings-list">
                  {paginatedCancelledBookings.map((booking) => (
                    <div key={booking.id} className="booking-card cancelled">
                      <div className="booking-header">
                        <div>
                          <span className="booking-id">#{booking.id}</span>
                          <span className="booking-label">{getMachineName(booking.machine_id)}</span>
                        </div>
                        <span className="booking-status cancelled">Отменено</span>
                      </div>
                      <div className="booking-info">
                        {!isUser && (
                          <div className="booking-info-item">
                            <span className="booking-info-label">Пользователь:</span>
                            <span className="booking-info-value">ID {booking.user_id}</span>
                          </div>
                        )}
                        <div className="booking-info-item">
                          <span className="booking-info-label">Начало:</span>
                          <span className="booking-info-value">
                            {dayjs(booking.start_at).format('DD.MM.YYYY HH:mm')}
                          </span>
                        </div>
                        <div className="booking-info-item">
                          <span className="booking-info-label">Конец:</span>
                          <span className="booking-info-value">
                            {dayjs(booking.end_at).format('DD.MM.YYYY HH:mm')}
                          </span>
                        </div>
                      </div>
                      <div className="booking-actions">
                        <button
                          onClick={() => handleDelete(booking.id)}
                          className="button-danger"
                          disabled={deleteMutation.isPending}
                        >
                          Удалить
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
                {cancelledBookings.length > cancelledItemsPerPage && (
                  <Pagination
                    currentPage={cancelledPage}
                    totalPages={cancelledTotalPages}
                    itemsPerPage={cancelledItemsPerPage}
                    totalItems={cancelledBookings.length}
                    onPageChange={setCancelledPage}
                    onItemsPerPageChange={setCancelledItemsPerPage}
                  />
                )}
              </div>
            )}

            {bookings.length === 0 && (
              <div className="empty-state">
                Нет активных бронирований. Создайте новое бронирование ниже.
              </div>
            )}
          </>
        )}
      </div>

      <div className="page-section">
        <h2 className="page-title">Создать бронирование</h2>
        <p className="page-description">
          Забронируйте машину на указанное время.
        </p>
        {showAddForm ? (
          <form onSubmit={handleSubmit} className="add-booking-form">
            <div className="form-row">
              {!isUser && (
                <div className="form-group">
                  <label htmlFor="booking-user-id">ID Пользователя</label>
                  <input
                    id="booking-user-id"
                    type="number"
                    value={newBooking.user_id}
                    onChange={(e) =>
                      setNewBooking({
                        ...newBooking,
                        user_id: parseInt(e.target.value) || 1,
                      })
                    }
                    required
                    min={1}
                  />
                </div>
              )}
              <div className="form-group">
                <label htmlFor="booking-machine-id">Машина</label>
                <select
                  id="booking-machine-id"
                  value={newBooking.machine_id}
                  onChange={(e) =>
                    setNewBooking({
                      ...newBooking,
                      machine_id: parseInt(e.target.value) || 1,
                    })
                  }
                  required
                >
                  {machines.map((machine) => (
                    <option key={machine.id} value={machine.id}>
                      {machine.name} ({machine.zone})
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="booking-start">Начало</label>
                <input
                  id="booking-start"
                  type="datetime-local"
                  value={newBooking.start_at}
                  onChange={(e) =>
                    setNewBooking({ ...newBooking, start_at: e.target.value })
                  }
                  required
                />
              </div>
              <div className="form-group">
                <label htmlFor="booking-end">Конец</label>
                <input
                  id="booking-end"
                  type="datetime-local"
                  value={newBooking.end_at}
                  onChange={(e) =>
                    setNewBooking({ ...newBooking, end_at: e.target.value })
                  }
                  required
                />
              </div>
            </div>
            <div className="form-group">
              <label htmlFor="booking-note">Примечание (необязательно)</label>
              <textarea
                id="booking-note"
                value={newBooking.note || ''}
                onChange={(e) =>
                  setNewBooking({ ...newBooking, note: e.target.value })
                }
                rows={3}
                className="textarea-input"
              />
            </div>
            <div className="form-actions">
              <button
                type="button"
                onClick={() => {
                  setShowAddForm(false)
                  setNewBooking({
                    user_id: profile?.id || 1,
                    machine_id: 1,
                    start_at: dayjs().format('YYYY-MM-DDTHH:mm'),
                    end_at: dayjs().add(1, 'hour').format('YYYY-MM-DDTHH:mm'),
                    note: '',
                  })
                }}
                className="button-secondary"
              >
                Отмена
              </button>
              <button
                type="submit"
                disabled={createMutation.isPending}
                className="button-primary"
              >
                {createMutation.isPending ? 'Создание...' : 'Создать бронирование'}
              </button>
            </div>
            {createMutation.isError && (
              <div className="error-message">
                {getErrorMessage(createMutation.error) || 'Ошибка при создании бронирования'}
              </div>
            )}
            {cancelMutation.isError && (
              <div className="error-message">
                {getErrorMessage(cancelMutation.error) || 'Ошибка при отмене бронирования'}
              </div>
            )}
          </form>
        ) : (
          <button
            onClick={() => setShowAddForm(true)}
            className="button-primary"
          >
            Создать бронирование
          </button>
        )}
      </div>
    </div>
  )
}


