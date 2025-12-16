/**
 * Константы приложения
 */

// Ценообразование
export const PRICING = {
  /** Стоимость часа игры (руб) */
  HOUR_RATE: 90,
  /** Оплата за смену (руб) */
  SHIFT_PAY: 2500,
  /** Стоимость электроэнергии за кВт/ч (руб) */
  ELECTRICITY_PRICE_PER_KWH: 7.0,
  /** Ежемесячная аренда (руб) */
  MONTHLY_RENT: 65000,
  /** Ставка налога */
  TAX_RATE: 0.13,
} as const

// Таймауты и интервалы (в миллисекундах)
export const TIMEOUTS = {
  /** Задержка перед редиректом на страницу оплаты */
  PAYMENT_REDIRECT: 2000,
  /** Длительность показа toast уведомления по умолчанию */
  TOAST_DURATION: 3000,
  /** Интервал проверки здоровья API */
  HEALTH_CHECK: 30000,
  /** Интервал автообновления сессий */
  SESSIONS_REFRESH: 30000,
} as const

// Лимиты и ограничения
export const LIMITS = {
  /** Минимальное количество часов для пополнения */
  MIN_TOP_UP_HOURS: 1,
  /** Максимальное количество часов для пополнения */
  MAX_TOP_UP_HOURS: 24,
  /** Минимальная длина пароля */
  MIN_PASSWORD_LENGTH: 6,
  /** Элементов на странице по умолчанию */
  DEFAULT_ITEMS_PER_PAGE: 10,
  /** Максимальное количество элементов на странице */
  MAX_ITEMS_PER_PAGE: 100,
} as const

// Размеры экрана
export const BREAKPOINTS = {
  /** Ширина экрана для мобильных устройств */
  MOBILE: 768,
} as const

// Сообщения
export const MESSAGES = {
  PAYMENT_CREATED: 'Платеж создан. Открывается страница оплаты...',
  PAYMENT_REDIRECT: 'Открывается страница оплаты...',
  LOGIN_SUCCESS: 'Успешный вход в систему',
  REGISTRATION_SUCCESS: 'Регистрация успешна! Войдите в систему.',
  MACHINE_CREATED: 'Машина успешно создана',
  MACHINE_STATUS_UPDATED: 'Статус машины обновлен',
  BOOKING_CREATED: 'Бронирование успешно создано',
  BOOKING_CANCELLED: 'Бронирование отменено',
  SESSION_STARTED: 'Сессия успешно запущена',
  SESSION_STOPPED: 'Сессия успешно завершена',
  SESSION_EXTENDED: 'Сессия продлена',
  CASH_PAYMENT_CREATED: 'Наличный платеж успешно создан',
  ONLINE_PAYMENT_CREATED: 'Онлайн платеж создан. Открывается страница оплаты...',
  USER_ROLE_UPDATED: 'Роль пользователя обновлена',
} as const

// Пути навигации
export const ROUTES = {
  LOGIN: '/login',
  REGISTER: '/register',
  DASHBOARD: '/dashboard',
  PROFILE: '/profile',
  MACHINES: '/machines',
  BOOKINGS: '/bookings',
  SESSIONS: '/sessions',
  PAYMENTS: '/payments',
  USERS: '/users',
  REPORTS: '/reports',
  AUDIT_LOGS: '/audit-logs',
} as const

