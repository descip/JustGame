import { useQuery } from '@tanstack/react-query'
import { machineService, bookingService, sessionService } from '../api/services'
import { MachineStatus, BookingStatus } from '../api/types'
import { PRICING } from '../constants'
import LoadingSkeleton from '../components/LoadingSkeleton'
import dayjs from 'dayjs'
import './Dashboard.css'

export default function Dashboard() {
  const { data: machines = [], isLoading: machinesLoading } = useQuery({
    queryKey: ['machines'],
    queryFn: machineService.list,
  })

  const { data: bookings = [], isLoading: bookingsLoading } = useQuery({
    queryKey: ['bookings'],
    queryFn: bookingService.list,
  })

  const { data: sessions = [], isLoading: sessionsLoading } = useQuery({
    queryKey: ['sessions'],
    queryFn: sessionService.list,
  })

  const isLoading = machinesLoading || bookingsLoading || sessionsLoading

  // Статистика машин
  const totalMachines = machines.length
  const availableMachines = machines.filter((m) => m.status === MachineStatus.available).length
  const busyMachines = machines.filter((m) => m.status === MachineStatus.busy).length
  const offlineMachines = machines.filter((m) => m.status === MachineStatus.offline).length

  // Бронирования на сегодня
  const today = dayjs().startOf('day')
  const todayBookings = bookings.filter((b) => {
    const startDate = dayjs(b.start_at).startOf('day')
    return startDate.isSame(today) && b.status === BookingStatus.active
  })

  // Ориентировочная выручка от бронирований (упрощенный расчет)
  const estimatedRevenue = todayBookings.length * PRICING.HOUR_RATE

  // Ближайшие бронирования
  const upcomingBookings = bookings
    .filter((b) => {
      const startDate = dayjs(b.start_at)
      return startDate.isAfter(dayjs()) && b.status === BookingStatus.active
    })
    .sort((a, b) => dayjs(a.start_at).diff(dayjs(b.start_at)))
    .slice(0, 5)

  // Активные сессии
  const activeSessions = sessions.filter((s) => !s.ended_at)

  // Статистика по зонам
  const machinesByZone = machines.reduce((acc, machine) => {
    if (!acc[machine.zone]) {
      acc[machine.zone] = { total: 0, available: 0, busy: 0, offline: 0 }
    }
    acc[machine.zone].total++
    if (machine.status === MachineStatus.available) acc[machine.zone].available++
    if (machine.status === MachineStatus.busy) acc[machine.zone].busy++
    if (machine.status === MachineStatus.offline) acc[machine.zone].offline++
    return acc
  }, {} as Record<string, { total: number; available: number; busy: number; offline: number }>)

  // Статистика по времени для сессий (последние 7 дней)
  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const date = dayjs().subtract(6 - i, 'days')
    return {
      date: date.format('DD.MM'),
      count: sessions.filter((s) => {
        const sessionDate = dayjs(s.started_at)
        return sessionDate.isSame(date, 'day')
      }).length,
    }
  })

  return (
    <div className="dashboard-page">
      <div className="dashboard-header">
        <h1 className="dashboard-title">Дашборд</h1>
        <p className="dashboard-subtitle">Общий обзор системы управления ПК-клубом</p>
      </div>

      {isLoading ? (
        <div className="dashboard-loading">
          <div className="skeleton-card">
            <LoadingSkeleton height="2rem" width="40%" className="skeleton-title" />
            <div className="stats-grid">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="stat-card">
                  <LoadingSkeleton height="1rem" width="60%" />
                  <LoadingSkeleton height="2rem" width="40%" style={{ marginTop: '0.5rem' }} />
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <>
          {/* Общий обзор */}
          <div className="dashboard-section">
            <h2 className="section-title">Общий обзор</h2>
            <p className="section-description">
              Текущее состояние машин и бронирований за сегодня.
            </p>

            <div className="stats-grid">
              <div className="stat-card">
                <div className="stat-label">Машин всего</div>
                <div className="stat-value">{totalMachines}</div>
              </div>
              <div className="stat-card success">
                <div className="stat-label">Свободно</div>
                <div className="stat-value">{availableMachines}</div>
              </div>
              <div className="stat-card warning">
                <div className="stat-label">Занято</div>
                <div className="stat-value">{busyMachines}</div>
              </div>
              <div className="stat-card error">
                <div className="stat-label">В сервисе</div>
                <div className="stat-value">{offlineMachines}</div>
              </div>
            </div>

            <div className="bookings-today">
              <h3 className="bookings-today-title">Брони на сегодня</h3>
              <div className="bookings-today-info">
                Всего: {todayBookings.length}; ориентировочная выручка:{' '}
                {estimatedRevenue.toFixed(2)} ₽
              </div>
            </div>
          </div>

          {/* Статистика по зонам */}
          {Object.keys(machinesByZone).length > 0 && (
            <div className="dashboard-section">
              <h2 className="section-title">Статистика по зонам</h2>
              <p className="section-description">
                Распределение машин по зонам и их статусы.
              </p>
              <div className="zones-grid">
                {Object.entries(machinesByZone).map(([zone, stats]) => (
                  <div key={zone} className="zone-stat-card">
                    <h3 className="zone-stat-title">{zone}</h3>
                    <div className="zone-stat-values">
                      <div className="zone-stat-item">
                        <span className="zone-stat-label">Всего:</span>
                        <span className="zone-stat-value">{stats.total}</span>
                      </div>
                      <div className="zone-stat-item">
                        <span className="zone-stat-label success">Свободно:</span>
                        <span className="zone-stat-value success">{stats.available}</span>
                      </div>
                      <div className="zone-stat-item">
                        <span className="zone-stat-label warning">Занято:</span>
                        <span className="zone-stat-value warning">{stats.busy}</span>
                      </div>
                      <div className="zone-stat-item">
                        <span className="zone-stat-label error">В сервисе:</span>
                        <span className="zone-stat-value error">{stats.offline}</span>
                      </div>
                    </div>
                    <div className="zone-stat-bar">
                      <div
                        className="zone-stat-bar-fill available"
                        style={{ width: `${(stats.available / stats.total) * 100}%` }}
                      ></div>
                      <div
                        className="zone-stat-bar-fill busy"
                        style={{ width: `${(stats.busy / stats.total) * 100}%` }}
                      ></div>
                      <div
                        className="zone-stat-bar-fill offline"
                        style={{ width: `${(stats.offline / stats.total) * 100}%` }}
                      ></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* График активности сессий */}
          {last7Days.some((d) => d.count > 0) && (
            <div className="dashboard-section">
              <h2 className="section-title">Активность сессий (последние 7 дней)</h2>
              <p className="section-description">
                Количество запущенных сессий по дням.
              </p>
              <div className="chart-container">
                <div className="chart-bars">
                  {last7Days.map((day, index) => {
                    const maxCount = Math.max(...last7Days.map((d) => d.count), 1)
                    const height = (day.count / maxCount) * 100
                    return (
                      <div key={index} className="chart-bar-item">
                        <div className="chart-bar-wrapper">
                          <div
                            className="chart-bar"
                            style={{ height: `${height}%` }}
                            title={`${day.count} сессий`}
                          >
                            <span className="chart-bar-value">{day.count}</span>
                          </div>
                        </div>
                        <div className="chart-bar-label">{day.date}</div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          )}

          <div className="dashboard-grid">
            {/* Ближайшие брони */}
            <div className="dashboard-section">
              <h2 className="section-title">Ближайшие брони</h2>
              <p className="section-description">
                Следующие несколько броней по времени.
              </p>
              {upcomingBookings.length > 0 ? (
                <div className="bookings-list">
                  {upcomingBookings.map((booking) => (
                    <div key={booking.id} className="booking-item">
                      <div className="booking-item-header">
                        <span className="booking-item-id">#{booking.id}</span>
                        <span className="booking-item-time">
                          {dayjs(booking.start_at).format('DD.MM.YYYY HH:mm')}
                        </span>
                      </div>
                      <div className="booking-item-details">
                        Машина ID: {booking.machine_id} | Пользователь ID: {booking.user_id}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="empty-state">Нет предстоящих броней.</div>
              )}
            </div>

            {/* Активные сессии */}
            <div className="dashboard-section">
              <h2 className="section-title">Активные сессии</h2>
              <p className="section-description">
                Текущие игровые сессии пользователей.
              </p>
              {activeSessions.length > 0 ? (
                <div className="sessions-list">
                  {activeSessions.map((session) => (
                    <div key={session.id} className="session-item">
                      <div className="session-item-header">
                        <span className="session-item-id">Сессия #{session.id}</span>
                        <span className="session-item-status active">Активна</span>
                      </div>
                      <div className="session-item-details">
                        Пользователь ID: {session.user_id} | Машина ID: {session.machine_id}
                      </div>
                      <div className="session-item-time">
                        Начало: {dayjs(session.started_at).format('DD.MM.YYYY HH:mm')}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="empty-state">Нет активных сессий.</div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}

