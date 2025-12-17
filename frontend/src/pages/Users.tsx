import { useState, useMemo, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { userService, authService } from '../api/services'
import { Role } from '../api/types'
import { useToastStore } from '../store/toastStore'
import { getErrorMessage } from '../utils/errorHandler'
import LoadingSkeleton from '../components/LoadingSkeleton'
import ConfirmDialog from '../components/ConfirmDialog'
import Pagination from '../components/Pagination'
import { UserOutlined } from '@ant-design/icons'
import './Users.css'

export default function Users() {
  const [searchQuery, setSearchQuery] = useState('')
  const [roleFilter, setRoleFilter] = useState<Role | 'all'>('all')
  const [updateConfirm, setUpdateConfirm] = useState<{ userId: number; newRole: Role } | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(10)
  const queryClient = useQueryClient()
  const showToast = useToastStore((state) => state.showToast)

  const { data: currentProfile } = useQuery({
    queryKey: ['profile'],
    queryFn: authService.getProfile,
  })

  const { data: users = [], isLoading } = useQuery({
    queryKey: ['users'],
    queryFn: userService.list,
  })

  const filteredUsers = useMemo(() => {
    return users.filter((user) => {
      const matchesSearch =
        user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.id.toString().includes(searchQuery)
      const matchesRole = roleFilter === 'all' || user.role === roleFilter
      return matchesSearch && matchesRole
    })
  }, [users, searchQuery, roleFilter])

  // Пагинация
  const totalPages = Math.ceil(filteredUsers.length / itemsPerPage)
  const paginatedUsers = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage
    const end = start + itemsPerPage
    return filteredUsers.slice(start, end)
  }, [filteredUsers, currentPage, itemsPerPage])

  // Сброс страницы при изменении поискового запроса или фильтра
  useEffect(() => {
    setCurrentPage(1)
  }, [searchQuery, roleFilter])

  const roleCounts = useMemo(() => {
    return {
      admin: users.filter((u) => u.role === Role.admin).length,
      operator: users.filter((u) => u.role === Role.operator).length,
      user: users.filter((u) => u.role === Role.user).length,
    }
  }, [users])

  const updateRoleMutation = useMutation({
    mutationFn: ({ userId, role }: { userId: number; role: Role }) =>
      userService.updateRole(userId, role),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
      setUpdateConfirm(null)
      showToast('Роль пользователя успешно обновлена', 'success')
    },
    onError: (error) => {
      setUpdateConfirm(null)
      showToast(getErrorMessage(error), 'error')
    },
  })

  const getRoleLabel = (role: Role) => {
    switch (role) {
      case Role.admin:
        return 'Администратор'
      case Role.operator:
        return 'Оператор'
      case Role.user:
        return 'Пользователь'
      default:
        return role
    }
  }

  const getRoleBadgeClass = (role: Role) => {
    switch (role) {
      case Role.admin:
        return 'role-badge-admin'
      case Role.operator:
        return 'role-badge-operator'
      case Role.user:
        return 'role-badge-user'
      default:
        return ''
    }
  }

  const handleRoleChange = (userId: number, newRole: Role) => {
    setUpdateConfirm({ userId, newRole })
  }

  const handleConfirmUpdate = () => {
    if (updateConfirm) {
      updateRoleMutation.mutate({
        userId: updateConfirm.userId,
        role: updateConfirm.newRole,
      })
    }
  }

  return (
    <div className="users-page">
      <ConfirmDialog
        isOpen={updateConfirm !== null}
        title="Изменить роль пользователя?"
        message={`Вы уверены, что хотите изменить роль пользователя на "${getRoleLabel(updateConfirm?.newRole || Role.user)}"?`}
        confirmText="Изменить"
        cancelText="Отмена"
        type="warning"
        onConfirm={handleConfirmUpdate}
        onCancel={() => setUpdateConfirm(null)}
      />

      <div className="page-section">
        <h2 className="page-title">Пользователи</h2>
        <p className="page-description">
          Управление пользователями системы. Здесь вы можете просматривать список пользователей и изменять их роли.
        </p>

        {!isLoading && users.length > 0 && (
          <div className="users-stats">
            <div className="stat-card">
              <div className="stat-label">Всего пользователей</div>
              <div className="stat-value">{users.length}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Администраторов</div>
              <div className="stat-value">{roleCounts.admin}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Операторов</div>
              <div className="stat-value">{roleCounts.operator}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Пользователей</div>
              <div className="stat-value">{roleCounts.user}</div>
            </div>
          </div>
        )}

        {!isLoading && users.length > 0 && (
          <div className="users-filters">
            <input
              type="text"
              placeholder="Поиск по email или ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="search-input"
            />
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value as Role | 'all')}
              className="filter-select"
            >
              <option value="all">Все роли</option>
              <option value={Role.admin}>Администраторы</option>
              <option value={Role.operator}>Операторы</option>
              <option value={Role.user}>Пользователи</option>
            </select>
          </div>
        )}

        {isLoading ? (
          <div className="users-list">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="user-card">
                <LoadingSkeleton height="1.5rem" width="40%" className="skeleton-title" />
                <LoadingSkeleton height="1rem" count={2} className="skeleton-text" />
              </div>
            ))}
          </div>
        ) : (
          <>
            {filteredUsers.length > 0 ? (
              <>
                <div className="users-list">
                  {paginatedUsers.map((user) => (
                    <div key={user.id} className="user-card">
                      <div className="user-header">
                        <div className="user-info">
                          <UserOutlined className="user-icon" />
                          <div>
                            <div className="user-email">{user.email}</div>
                            <div className="user-id">ID: {user.id}</div>
                          </div>
                        </div>
                        <div className={`role-badge ${getRoleBadgeClass(user.role)}`}>
                          {getRoleLabel(user.role)}
                        </div>
                      </div>
                      <div className="user-actions">
                        <label className="role-select-label">
                          Изменить роль:
                          <select
                            value={user.role}
                            onChange={(e) =>
                              handleRoleChange(user.id, e.target.value as Role)
                            }
                            disabled={
                              updateRoleMutation.isPending ||
                              user.id === currentProfile?.id // Нельзя изменить свою роль
                            }
                            className="role-select"
                          >
                            <option value={Role.user}>Пользователь</option>
                            <option value={Role.operator}>Оператор</option>
                            <option value={Role.admin}>Администратор</option>
                          </select>
                        </label>
                      </div>
                    </div>
                  ))}
                </div>
                <Pagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  itemsPerPage={itemsPerPage}
                  totalItems={filteredUsers.length}
                  onPageChange={setCurrentPage}
                  onItemsPerPageChange={setItemsPerPage}
                />
              </>
            ) : (
              <div className="empty-state">
                {searchQuery || roleFilter !== 'all'
                  ? 'Пользователи не найдены'
                  : 'Нет пользователей'}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

