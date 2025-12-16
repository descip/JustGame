import { AxiosError } from 'axios'

function translateField(loc: string | null): string | null {
  if (!loc) return null
  const key = loc.replace(/^body\./, '')
  const last = key.split('.').pop() || key

  const map: Record<string, string> = {
    user_id: 'Пользователь',
    machine_id: 'Машина',
    start_at: 'Начало',
    end_at: 'Конец',
    hours: 'Часы',
    add_hours: 'Часы',
    email: 'Email',
    password: 'Пароль',
    note: 'Примечание',
  }

  return map[last] || null
}

function translateMessage(message: string): string {
  const normalized = message.replace(/^Value error,\s*/i, '').trim()
  const exact: Record<string, string> = {
    // auth / access
    'Not authenticated': 'Необходимо войти в систему.',
    'Insufficient role': 'Недостаточно прав для выполнения операции.',

    // common entities
    'User not found': 'Пользователь не найден.',
    'Machine not found': 'Машина не найдена.',
    'Booking not found': 'Бронирование не найдено.',
    'Session not found': 'Сессия не найдена.',

    // bookings
    'Booking overlap': 'На это время машина уже забронирована.',
    'User already has an active booking for this time range':
      'У пользователя уже есть бронирование, пересекающееся по времени.',

    // sessions
    'User already has an active session': 'У пользователя уже есть активная сессия.',
    'Machine already has an active session': 'На этой машине уже есть активная сессия.',
    'Machine is not available': 'Машина сейчас недоступна.',
    'Session already ended': 'Сессия уже завершена.',
    'auto_end_at is not set': 'Ошибка сервера: не задано время авто-завершения.',
  }

  if (exact[normalized]) return exact[normalized]

  // booking validators (backend)
  if (normalized === 'start_at must not be in the past') return 'Нельзя бронировать на прошедшее время.'
  if (normalized === 'end_at must be greater than start_at') return 'Неправильная дата'
  if (normalized.includes('end_at must be greater than start_at')) return 'Неправильная дата'

  // Pydantic / FastAPI common messages
  if (normalized === 'Field required') return 'Поле обязательно для заполнения.'
  if (normalized.toLowerCase().includes('valid datetime')) return 'Некорректная дата/время.'
  if (/greater than or equal to/i.test(normalized)) return 'Значение слишком маленькое.'
  if (/less than or equal to/i.test(normalized)) return 'Значение слишком большое.'

  return normalized
}

/**
 * Извлекает сообщение об ошибке из ответа API
 */
export function getErrorMessage(error: unknown): string {
  if (error instanceof AxiosError) {
    if (!error.response) {
      return 'Не удалось подключиться к серверу. Проверьте, что API запущен.'
    }

    const data: any = error.response?.data
    const detail: any = data?.detail

    // FastAPI validation errors: { detail: [{ loc: [...], msg: "...", type: "..." }, ...] }
    if (Array.isArray(detail)) {
      const parts = detail
        .map((item) => {
          if (!item) return null
          const msgRaw = typeof item.msg === 'string' ? item.msg : null
          const locRaw = Array.isArray(item.loc) ? item.loc.join('.') : null
          const field = translateField(locRaw)
          const msg = msgRaw ? translateMessage(msgRaw) : null
          // Для общей ошибки даты не показываем префикс поля ("Конец:", "Начало:" и т.п.)
          if (msg === 'Неправильная дата') return msg
          if (field && msg) return `${field}: ${msg}`
          if (msg) return msg
          return null
        })
        .filter(Boolean) as string[]
      if (parts.length > 0) return parts.join('\n')
    }

    if (typeof detail === 'string') return translateMessage(detail)
    if (typeof data === 'string') return data
    if (typeof data?.message === 'string') return data.message
    if (typeof error.message === 'string' && error.message) return translateMessage(error.message)

    try {
      return JSON.stringify(detail ?? data ?? error)
    } catch {
      return 'Произошла ошибка'
    }
  }
  if (error instanceof Error) {
    return translateMessage(error.message)
  }
  return 'Произошла неизвестная ошибка'
}

/**
 * Проверяет, является ли ошибка AxiosError
 */
export function isAxiosError(error: unknown): error is AxiosError {
  return error instanceof AxiosError
}

