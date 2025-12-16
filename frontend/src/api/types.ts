export enum Zone {
  STANDART = 'STANDART',
  PREMIUM = 'PREMIUM',
  VIP = 'VIP',
  SUPERVIP = 'SUPERVIP',
  SOLO = 'SOLO',
}

export enum MachineStatus {
  available = 'available',
  busy = 'busy',
  offline = 'offline',
}

export enum BookingStatus {
  active = 'active',
  cancelled = 'cancelled',
}

export interface Machine {
  id: number
  name: string
  zone: Zone
  status: MachineStatus
  watt: number
}

export interface MachineCreate {
  name: string
  zone: Zone
  watt?: number
}

export interface MachineStatusPatch {
  status: MachineStatus
}

export interface Booking {
  id: number
  user_id: number
  machine_id: number
  start_at: string
  end_at: string
  note: string | null
  status: BookingStatus
}

export interface BookingCreate {
  user_id: number
  machine_id: number
  start_at: string
  end_at: string
  note?: string | null
}

export interface Session {
  id: number
  user_id: number
  machine_id: number
  started_at: string
  ended_at: string | null
  paid_minutes: number
  auto_end_at: string | null
  billed_minutes: number | null
  amount: number
}

export interface SessionStartIn {
  user_id: number
  machine_id: number
  hours: number
}

export interface LoginRequest {
  email: string
  password: string
}

export interface TokenResponse {
  access_token: string
  token_type: string
}

// User
export enum Role {
  admin = 'admin',
  operator = 'operator',
  user = 'user',
}

export interface User {
  id: number
  email: string
  role: Role
}

export interface UserProfile {
  id: number
  email: string
  role: Role
  balance: number
}

export interface UserCreate {
  email: string
  password: string
  role?: Role
}

export interface UserRoleUpdate {
  role: Role
}

// Payments
export enum PaymentMethod {
  cash = 'cash',
  online = 'online',
}

export enum PaymentStatus {
  created = 'created',
  pending = 'pending',
  succeeded = 'succeeded',
  failed = 'failed',
}

export interface Payment {
  id: number
  user_id: number
  session_id: number | null
  created_at: string
  updated_at: string
  method: PaymentMethod
  status: PaymentStatus
  hours: number
  amount: number
  provider_payment_id: string | null
  note: string | null
}

export interface CashPaymentCreate {
  user_id: number
  hours: number
  note?: string | null
}

export interface OnlinePaymentCreate {
  hours: number
}

export interface OnlinePaymentCreateOut {
  payment_id: number
  payment_url: string
}

export interface FakeOnlinePaymentCreate {
  user_id: number
  hours: number
}

// Reports
export interface PowerRow {
  machine_id: number
  machine_name: string
  watt: number
  hours_used: number
  kwh_used: number
}

export interface PowerReportOut {
  date_from: string
  date_to: string
  price_per_kwh: number
  rows: PowerRow[]
  total_kwh: number
  total_cost: number
}

export interface SalaryRow {
  employee_id: number
  full_name: string
  shifts: number
  pay_per_shift: number
  total_salary: number
  taxes: number
}

export interface SalariesReportOut {
  month: string
  rows: SalaryRow[]
  total_salary: number
  total_taxes: number
}

export interface FinanceReportOut {
  date_from: string
  date_to: string
  income: number
  expense_rent: number
  expense_salaries: number
  expense_taxes: number
  expense_electricity: number
  total_expenses: number
  profit: number
}

// Audit Logs
export interface AuditLog {
  id: number
  user_id: number | null
  role: string
  action: string
  entity: string | null
  entity_id: number | null
  details: string | null
  ip_address: string | null
  created_at: string
}


