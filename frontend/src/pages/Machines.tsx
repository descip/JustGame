import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { machineService } from '../api/services'
import { Machine, MachineCreate, Zone, MachineStatus } from '../api/types'
import { useToastStore } from '../store/toastStore'
import { getErrorMessage } from '../utils/errorHandler'
import LoadingSkeleton from '../components/LoadingSkeleton'
import './Machines.css'

export default function Machines() {
  const [showAddForm, setShowAddForm] = useState(false)
  const [newMachine, setNewMachine] = useState<MachineCreate>({
    name: '',
    zone: Zone.STANDART,
    watt: 450,
  })
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<MachineStatus | 'all'>('all')
  const [zoneFilter, setZoneFilter] = useState<Zone | 'all'>('all')
  const queryClient = useQueryClient()
  const showToast = useToastStore((state) => state.showToast)

  const { data: machines = [], isLoading } = useQuery({
    queryKey: ['machines'],
    queryFn: machineService.list,
  })

  const filteredMachines = useMemo(() => {
    return machines.filter((machine) => {
      const matchesSearch =
        machine.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        machine.zone.toLowerCase().includes(searchQuery.toLowerCase())
      const matchesStatus = statusFilter === 'all' || machine.status === statusFilter
      const matchesZone = zoneFilter === 'all' || machine.zone === zoneFilter
      return matchesSearch && matchesStatus && matchesZone
    })
  }, [machines, searchQuery, statusFilter, zoneFilter])

  const machinesByZone = useMemo(() => {
    const grouped: Record<string, Machine[]> = {}
    filteredMachines.forEach((machine) => {
      if (!grouped[machine.zone]) {
        grouped[machine.zone] = []
      }
      grouped[machine.zone].push(machine)
    })
    return grouped
  }, [filteredMachines])

  const statusCounts = useMemo(() => {
    const counts = {
      available: machines.filter((m) => m.status === MachineStatus.available).length,
      busy: machines.filter((m) => m.status === MachineStatus.busy).length,
      offline: machines.filter((m) => m.status === MachineStatus.offline).length,
    }
    return counts
  }, [machines])

  const createMutation = useMutation({
    mutationFn: machineService.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['machines'] })
      setShowAddForm(false)
      setNewMachine({ name: '', zone: Zone.STANDART, watt: 450 })
      showToast('Машина успешно создана', 'success')
    },
    onError: (error) => {
      showToast(getErrorMessage(error), 'error')
    },
  })

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: number; status: MachineStatus }) =>
      machineService.updateStatus(id, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['machines'] })
      showToast('Статус машины обновлен', 'success')
    },
    onError: (error) => {
      showToast(getErrorMessage(error), 'error')
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    createMutation.mutate(newMachine)
  }

  const handleStatusChange = (id: number, status: MachineStatus) => {
    statusMutation.mutate({ id, status })
  }

  const getStatusLabel = (status: MachineStatus) => {
    switch (status) {
      case MachineStatus.available:
        return 'Доступна'
      case MachineStatus.busy:
        return 'Занята'
      case MachineStatus.offline:
        return 'Недоступна'
      default:
        return status
    }
  }

  const getStatusClass = (status: MachineStatus) => {
    switch (status) {
      case MachineStatus.available:
        return 'status-available'
      case MachineStatus.busy:
        return 'status-busy'
      case MachineStatus.offline:
        return 'status-offline'
      default:
        return ''
    }
  }

  return (
    <div className="machines-page">
      <div className="page-section">
        <h2 className="page-title">Состояние машин</h2>
        <p className="page-description">
          Следите за загрузкой зон и оперативно реагируйте, когда машины
          недоступны или в сервисе.
        </p>
        
        {machines.length > 0 && (
          <div className="machines-stats">
            <div className="stat-item">
              <span className="stat-label">Доступно:</span>
              <span className="stat-value available">{statusCounts.available}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Занято:</span>
              <span className="stat-value busy">{statusCounts.busy}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Недоступно:</span>
              <span className="stat-value offline">{statusCounts.offline}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Всего:</span>
              <span className="stat-value total">{machines.length}</span>
            </div>
          </div>
        )}
        
        {machines.length > 0 && (
          <div className="machines-filters">
            <div className="filter-group">
              <input
                type="text"
                placeholder="Поиск по названию или зоне..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="search-input"
              />
            </div>
            <div className="filter-group">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as MachineStatus | 'all')}
                className="filter-select"
              >
                <option value="all">Все статусы</option>
                <option value={MachineStatus.available}>Доступна</option>
                <option value={MachineStatus.busy}>Занята</option>
                <option value={MachineStatus.offline}>Недоступна</option>
              </select>
            </div>
            <div className="filter-group">
              <select
                value={zoneFilter}
                onChange={(e) => setZoneFilter(e.target.value as Zone | 'all')}
                className="filter-select"
              >
                <option value="all">Все зоны</option>
                <option value={Zone.STANDART}>STANDART</option>
                <option value={Zone.PREMIUM}>PREMIUM</option>
                <option value={Zone.VIP}>VIP</option>
                <option value={Zone.SUPERVIP}>SUPERVIP</option>
                <option value={Zone.SOLO}>SOLO</option>
              </select>
            </div>
          </div>
        )}

        {isLoading ? (
          <div className="machines-grid">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="machine-card">
                <LoadingSkeleton height="1.5rem" width="60%" className="skeleton-title" />
                <LoadingSkeleton height="1rem" count={3} className="skeleton-text" />
              </div>
            ))}
          </div>
        ) : machines.length === 0 ? (
          <div className="empty-state">
            Пока нет зарегистрированных машин.
          </div>
        ) : filteredMachines.length === 0 ? (
          <div className="empty-state">
            Машины не найдены по заданным фильтрам.
          </div>
        ) : (
          <>
            {Object.entries(machinesByZone).map(([zone, zoneMachines]) => (
              <div key={zone} className="zone-section">
                <h3 className="zone-title">{zone} ({zoneMachines.length})</h3>
                <div className="machines-grid">
                  {zoneMachines.map((machine) => (
              <div key={machine.id} className="machine-card">
                <div className="machine-header">
                  <h3 className="machine-name">{machine.name}</h3>
                  <span className={`machine-status ${getStatusClass(machine.status)}`}>
                    {getStatusLabel(machine.status)}
                  </span>
                </div>
                <div className="machine-info">
                  <div className="machine-info-item">
                    <span className="machine-info-label">Зона:</span>
                    <span className="machine-info-value">{machine.zone}</span>
                  </div>
                  <div className="machine-info-item">
                    <span className="machine-info-label">Мощность:</span>
                    <span className="machine-info-value">{machine.watt} Вт</span>
                  </div>
                </div>
                <div className="machine-actions">
                  <select
                    value={machine.status}
                    onChange={(e) =>
                      handleStatusChange(machine.id, e.target.value as MachineStatus)
                    }
                    className="status-select"
                  >
                    <option value={MachineStatus.available}>Доступна</option>
                    <option value={MachineStatus.busy}>Занята</option>
                    <option value={MachineStatus.offline}>Недоступна</option>
                  </select>
                </div>
                  </div>
                  ))}
                </div>
              </div>
            ))}
          </>
        )}
      </div>

      <div className="page-section">
        <h2 className="page-title">Добавить машину</h2>
        <p className="page-description">
          Создайте новую машину, указав её название и зону. Доступно только для
          ролей admin / operator.
        </p>
        {showAddForm ? (
          <form onSubmit={handleSubmit} className="add-machine-form">
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="machine-name">Название</label>
                <input
                  id="machine-name"
                  type="text"
                  value={newMachine.name}
                  onChange={(e) =>
                    setNewMachine({ ...newMachine, name: e.target.value })
                  }
                  required
                  maxLength={50}
                  placeholder="PC-01"
                />
              </div>
              <div className="form-group">
                <label htmlFor="machine-zone">Зона</label>
                <select
                  id="machine-zone"
                  value={newMachine.zone}
                  onChange={(e) =>
                    setNewMachine({ ...newMachine, zone: e.target.value as Zone })
                  }
                  required
                >
                  <option value={Zone.STANDART}>STANDART</option>
                  <option value={Zone.PREMIUM}>PREMIUM</option>
                  <option value={Zone.VIP}>VIP</option>
                  <option value={Zone.SUPERVIP}>SUPERVIP</option>
                  <option value={Zone.SOLO}>SOLO</option>
                </select>
              </div>
              <div className="form-group">
                <label htmlFor="machine-watt">Мощность (Вт)</label>
                <input
                  id="machine-watt"
                  type="number"
                  value={newMachine.watt}
                  onChange={(e) =>
                    setNewMachine({ ...newMachine, watt: parseInt(e.target.value) || 450 })
                  }
                  min={50}
                  max={2000}
                  required
                />
              </div>
            </div>
            <div className="form-actions">
              <button
                type="button"
                onClick={() => {
                  setShowAddForm(false)
                  setNewMachine({ name: '', zone: Zone.STANDART, watt: 450 })
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
                {createMutation.isPending ? 'Создание...' : 'Создать машину'}
              </button>
            </div>
            {createMutation.isError && (
              <div className="error-message">
                {getErrorMessage(createMutation.error) || 'Ошибка при создании машины'}
              </div>
            )}
            {statusMutation.isError && (
              <div className="error-message">
                {getErrorMessage(statusMutation.error) || 'Ошибка при обновлении статуса'}
              </div>
            )}
          </form>
        ) : (
          <button
            onClick={() => setShowAddForm(true)}
            className="button-primary"
          >
            Создать машину
          </button>
        )}
      </div>
    </div>
  )
}


