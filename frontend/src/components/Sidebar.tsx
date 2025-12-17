import { useEffect } from 'react'
import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import { useQuery } from '@tanstack/react-query'
import { healthService } from '../api/services'
import {
  DashboardOutlined,
  DesktopOutlined,
  CalendarOutlined,
  PlayCircleOutlined,
  DollarOutlined,
  FileTextOutlined,
  AuditOutlined,
  LogoutOutlined,
  UserOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  CloseOutlined,
} from '@ant-design/icons'
import './Sidebar.css'

const adminMenuItems = [
  { path: '/dashboard', label: 'Дашборд', icon: DashboardOutlined },
  { path: '/machines', label: 'Машины', icon: DesktopOutlined },
  { path: '/bookings', label: 'Брони', icon: CalendarOutlined },
  { path: '/sessions', label: 'Сессии', icon: PlayCircleOutlined },
  { path: '/payments', label: 'Платежи', icon: DollarOutlined },
]

const operatorMenuItems = [
  { path: '/dashboard', label: 'Дашборд', icon: DashboardOutlined },
  { path: '/machines', label: 'Машины', icon: DesktopOutlined },
  { path: '/bookings', label: 'Брони', icon: CalendarOutlined },
  { path: '/sessions', label: 'Сессии', icon: PlayCircleOutlined },
  { path: '/payments', label: 'Платежи', icon: DollarOutlined },
  { path: '/users', label: 'Пользователи', icon: UserOutlined },
  { path: '/reports', label: 'Отчеты', icon: FileTextOutlined },
  { path: '/audit-logs', label: 'Журнал аудита', icon: AuditOutlined },
]

const userMenuItems = [
  { path: '/bookings', label: 'Брони', icon: CalendarOutlined },
]

interface SidebarProps {
  isOpen?: boolean
  onClose?: () => void
}

export default function Sidebar({ isOpen = true, onClose }: SidebarProps) {
  const logout = useAuthStore((state) => state.logout)
  const getUser = useAuthStore((state) => state.getUser)
  const user = getUser()
  const location = useLocation()
  const navigate = useNavigate()

  const { data: health } = useQuery({
    queryKey: ['health'],
    queryFn: healthService.check,
    refetchInterval: 30000, // Проверка каждые 30 секунд
    retry: 1,
  })

  // Закрываем сайдбар на мобильных при переходе на другую страницу
  useEffect(() => {
    if (window.innerWidth <= 768 && onClose) {
      onClose()
    }
  }, [location.pathname, onClose])

  const handleLogout = () => {
    logout()
    window.location.href = '/login'
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

  return (
    <>
      {isOpen && <div className="sidebar-overlay" onClick={onClose} />}
      <aside className={`sidebar ${isOpen ? 'open' : ''}`}>
        <button className="sidebar-close" onClick={onClose} aria-label="Закрыть меню">
          <CloseOutlined />
        </button>
      <div className="sidebar-header">
        <h1 className="sidebar-logo">
          <div className="sidebar-logo-sphere"></div>
          JUSTGAME CONTROL
        </h1>
        <p className="sidebar-subtitle">Управление ПК-клубом</p>
        <div className="sidebar-health">
          {health?.ok ? (
            <div className="health-indicator online">
              <CheckCircleOutlined className="health-icon" />
              <span>Система работает</span>
            </div>
          ) : (
            <div className="health-indicator offline">
              <CloseCircleOutlined className="health-icon" />
              <span>Система недоступна</span>
            </div>
          )}
        </div>
      </div>
      <nav className="sidebar-nav">
        {(
          user?.role === 'user' 
            ? userMenuItems 
            : user?.role === 'operator' 
            ? operatorMenuItems 
            : adminMenuItems
        ).map((item) => {
          const Icon = item.icon
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `sidebar-nav-item ${isActive ? 'active' : ''}`
              }
            >
              <Icon className="sidebar-nav-icon" />
              <span>{item.label}</span>
            </NavLink>
          )
        })}
      </nav>
      <div className="sidebar-footer">
        {user && (
          <div 
            className={`sidebar-user ${location.pathname === '/profile' ? 'active' : ''}`}
            onClick={() => {
              navigate('/profile')
              if (window.innerWidth <= 768 && onClose) {
                onClose()
              }
            }}
            style={{ cursor: 'pointer' }}
          >
            <UserOutlined className="sidebar-user-icon" />
            <div className="sidebar-user-info">
              <div className="sidebar-user-email">{user.email}</div>
              <div className="sidebar-user-role">{getRoleLabel(user.role)}</div>
            </div>
          </div>
        )}
        <button className="sidebar-logout" onClick={handleLogout}>
          <LogoutOutlined className="sidebar-logout-icon" />
          <span>Выйти</span>
        </button>
      </div>
    </aside>
    </>
  )
}

