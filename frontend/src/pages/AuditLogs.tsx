import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { auditLogService } from '../api/services'
import dayjs from 'dayjs'
import './AuditLogs.css'

export default function AuditLogs() {
  const [userId, setUserId] = useState<number | undefined>(undefined)
  const [action, setAction] = useState<string>('')
  const [entity, setEntity] = useState<string>('')
  const [dateFrom, setDateFrom] = useState<string>('')
  const [dateTo, setDateTo] = useState<string>('')
  const [limit, setLimit] = useState(200)

  const { data: logs = [], isLoading } = useQuery({
    queryKey: ['audit-logs', userId, action, entity, dateFrom, dateTo, limit],
    queryFn: () =>
      auditLogService.list({
        user_id: userId,
        action: action || undefined,
        entity: entity || undefined,
        date_from: dateFrom || undefined,
        date_to: dateTo || undefined,
        limit,
      }),
  })

  const handleReset = () => {
    setUserId(undefined)
    setAction('')
    setEntity('')
    setDateFrom('')
    setDateTo('')
    setLimit(200)
  }

  return (
    <div className="audit-logs-page">
      <div className="page-section">
        <h2 className="page-title">Журнал аудита</h2>
        <p className="page-description">
          Просмотр всех действий пользователей в системе. Доступно только для ролей admin / operator.
        </p>

        <div className="audit-filters">
          <div className="filter-group">
            <label>ID Пользователя</label>
            <input
              type="number"
              value={userId || ''}
              onChange={(e) =>
                setUserId(e.target.value ? parseInt(e.target.value) : undefined)
              }
              placeholder="Все"
              className="filter-input"
            />
          </div>
          <div className="filter-group">
            <label>Действие</label>
            <input
              type="text"
              value={action}
              onChange={(e) => setAction(e.target.value)}
              placeholder="Например: START_SESSION"
              className="filter-input"
            />
          </div>
          <div className="filter-group">
            <label>Сущность</label>
            <input
              type="text"
              value={entity}
              onChange={(e) => setEntity(e.target.value)}
              placeholder="Например: session"
              className="filter-input"
            />
          </div>
          <div className="filter-group">
            <label>Дата от</label>
            <input
              type="datetime-local"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="filter-input"
            />
          </div>
          <div className="filter-group">
            <label>Дата до</label>
            <input
              type="datetime-local"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="filter-input"
            />
          </div>
          <div className="filter-group">
            <label>Лимит</label>
            <input
              type="number"
              value={limit}
              onChange={(e) => setLimit(parseInt(e.target.value) || 200)}
              min={1}
              max={2000}
              className="filter-input"
            />
          </div>
          <button onClick={handleReset} className="button-secondary">
            Сбросить
          </button>
        </div>

        {isLoading ? (
          <div className="loading">Загрузка логов...</div>
        ) : logs.length === 0 ? (
          <div className="empty-state">Логи не найдены</div>
        ) : (
          <>
            <div className="logs-summary">
              Найдено записей: {logs.length}
            </div>
            <div className="logs-list">
              {logs.map((log) => (
                <div key={log.id} className="log-card">
                  <div className="log-header">
                    <div className="log-id">#{log.id}</div>
                    <div className="log-time">
                      {dayjs(log.created_at).format('DD.MM.YYYY HH:mm:ss')}
                    </div>
                  </div>
                  <div className="log-info">
                    <div className="log-info-row">
                      <div className="log-info-item">
                        <span className="log-info-label">Пользователь:</span>
                        <span className="log-info-value">
                          {log.user_id ? `ID ${log.user_id}` : 'Система'}
                        </span>
                      </div>
                      <div className="log-info-item">
                        <span className="log-info-label">Роль:</span>
                        <span className="log-info-value">{log.role}</span>
                      </div>
                    </div>
                    <div className="log-info-row">
                      <div className="log-info-item">
                        <span className="log-info-label">Действие:</span>
                        <span className="log-info-value action">{log.action}</span>
                      </div>
                      <div className="log-info-item">
                        <span className="log-info-label">Сущность:</span>
                        <span className="log-info-value">
                          {log.entity || '-'} {log.entity_id ? `#${log.entity_id}` : ''}
                        </span>
                      </div>
                    </div>
                    {log.details && (
                      <div className="log-details">
                        <span className="log-details-label">Детали:</span>
                        <span className="log-details-value">{log.details}</span>
                      </div>
                    )}
                    {log.ip_address && (
                      <div className="log-ip">
                        IP: {log.ip_address}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

