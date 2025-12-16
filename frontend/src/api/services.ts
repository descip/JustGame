import apiClient from './client'
import {
  Machine,
  MachineCreate,
  MachineStatusPatch,
  Booking,
  BookingCreate,
  Session,
  SessionStartIn,
  LoginRequest,
  TokenResponse,
  Payment,
  CashPaymentCreate,
  OnlinePaymentCreate,
  OnlinePaymentCreateOut,
  FakeOnlinePaymentCreate,
  PowerReportOut,
  SalariesReportOut,
  FinanceReportOut,
  AuditLog,
  User,
  UserCreate,
  UserProfile,
  UserRoleUpdate,
} from './types'

// Auth
export const authService = {
  login: async (data: LoginRequest): Promise<TokenResponse> => {
    const response = await apiClient.post<TokenResponse>('/auth/login', data)
    return response.data
  },
  register: async (data: UserCreate): Promise<User> => {
    const response = await apiClient.post<User>('/auth/register', data)
    return response.data
  },
  getProfile: async (): Promise<UserProfile> => {
    const response = await apiClient.get<UserProfile>('/auth/me')
    return response.data
  },
}

// Health
export const healthService = {
  check: async (): Promise<{ ok: boolean }> => {
    const response = await apiClient.get<{ ok: boolean }>('/health')
    return response.data
  },
}

// Machines
export const machineService = {
  list: async (): Promise<Machine[]> => {
    const response = await apiClient.get<Machine[]>('/machines')
    return response.data
  },
  create: async (data: MachineCreate): Promise<Machine> => {
    const response = await apiClient.post<Machine>('/machines', data)
    return response.data
  },
  updateStatus: async (
    id: number,
    data: MachineStatusPatch
  ): Promise<Machine> => {
    const response = await apiClient.patch<Machine>(
      `/machines/${id}/status`,
      data
    )
    return response.data
  },
}

// Bookings
export const bookingService = {
  list: async (): Promise<Booking[]> => {
    const response = await apiClient.get<Booking[]>('/bookings')
    return response.data
  },
  create: async (data: BookingCreate): Promise<Booking> => {
    const response = await apiClient.post<Booking>('/bookings', data)
    return response.data
  },
  cancel: async (id: number): Promise<{ id: number; status: string }> => {
    const response = await apiClient.post<{ id: number; status: string }>(
      `/bookings/${id}/cancel`
    )
    return response.data
  },
  delete: async (id: number): Promise<{ ok: boolean }> => {
    const response = await apiClient.delete<{ ok: boolean }>(`/bookings/${id}`)
    return response.data
  },
}

// Sessions
export const sessionService = {
  list: async (): Promise<Session[]> => {
    const response = await apiClient.get<Session[]>('/sessions')
    return response.data
  },
  start: async (data: SessionStartIn): Promise<Session> => {
    const response = await apiClient.post<Session>('/sessions/start', data)
    return response.data
  },
  stop: async (id: number): Promise<{
    id: number
    billed_minutes: number
    amount: number
    ended_at: string
  }> => {
    const response = await apiClient.post<{
      id: number
      billed_minutes: number
      amount: number
      ended_at: string
    }>(`/sessions/${id}/stop`)
    return response.data
  },
  extend: async (
    id: number,
    addHours: number
  ): Promise<{
    id: number
    paid_minutes: number
    auto_end_at: string
  }> => {
    const response = await apiClient.post<{
      id: number
      paid_minutes: number
      auto_end_at: string
    }>(`/sessions/${id}/extend`, { add_hours: addHours })
    return response.data
  },
  delete: async (id: number): Promise<{ ok: boolean }> => {
    const response = await apiClient.delete<{ ok: boolean }>(`/sessions/${id}`)
    return response.data
  },
}

// Payments
export const paymentService = {
  list: async (): Promise<Payment[]> => {
    const response = await apiClient.get<Payment[]>('/payments')
    return response.data
  },
  createCash: async (data: CashPaymentCreate): Promise<Payment> => {
    const response = await apiClient.post<Payment>('/payments/cash', data)
    return response.data
  },
  createOnline: async (data: OnlinePaymentCreate): Promise<OnlinePaymentCreateOut> => {
    const response = await apiClient.post<OnlinePaymentCreateOut>('/payments/online', data)
    return response.data
  },
  createFakeOnline: async (data: FakeOnlinePaymentCreate): Promise<Payment> => {
    const response = await apiClient.post<Payment>('/payments/fake/online', data)
    return response.data
  },
}

// Reports
export const reportService = {
  getPowerReport: async (
    dateFrom: string,
    dateTo: string,
    pricePerKwh: number = 7.0
  ): Promise<PowerReportOut> => {
    const response = await apiClient.get<PowerReportOut>('/reports/power', {
      params: {
        date_from: dateFrom,
        date_to: dateTo,
        price_per_kwh: pricePerKwh,
      },
    })
    return response.data
  },
  exportPowerReport: async (
    dateFrom: string,
    dateTo: string,
    pricePerKwh: number = 7.0
  ): Promise<Blob> => {
    const response = await apiClient.get('/reports/power.xlsx', {
      params: {
        date_from: dateFrom,
        date_to: dateTo,
        price_per_kwh: pricePerKwh,
      },
      responseType: 'blob',
    })
    return response.data
  },
  getSalariesReport: async (month: string): Promise<SalariesReportOut> => {
    const response = await apiClient.get<SalariesReportOut>('/reports/salaries', {
      params: { month },
    })
    return response.data
  },
  exportSalariesReport: async (month: string): Promise<Blob> => {
    const response = await apiClient.get('/reports/salaries.xlsx', {
      params: { month },
      responseType: 'blob',
    })
    return response.data
  },
  getFinanceReport: async (
    dateFrom: string,
    dateTo: string
  ): Promise<FinanceReportOut> => {
    const response = await apiClient.get<FinanceReportOut>('/reports/finance', {
      params: {
        date_from: dateFrom,
        date_to: dateTo,
      },
    })
    return response.data
  },
  exportFinanceReport: async (
    dateFrom: string,
    dateTo: string
  ): Promise<Blob> => {
    const response = await apiClient.get('/reports/finance.xlsx', {
      params: {
        date_from: dateFrom,
        date_to: dateTo,
      },
      responseType: 'blob',
    })
    return response.data
  },
}

// Audit Logs
export const auditLogService = {
  list: async (params?: {
    user_id?: number
    action?: string
    entity?: string
    date_from?: string
    date_to?: string
    limit?: number
  }): Promise<AuditLog[]> => {
    const response = await apiClient.get<AuditLog[]>('/audit-logs', { params })
    return response.data
  },
}

// Users
export const userService = {
  list: async (): Promise<User[]> => {
    const response = await apiClient.get<User[]>('/users')
    return response.data
  },
  updateRole: async (userId: number, role: Role): Promise<User> => {
    const response = await apiClient.patch<User>(`/users/${userId}/role`, { role })
    return response.data
  },
}

