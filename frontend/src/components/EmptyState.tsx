import { InboxOutlined } from '@ant-design/icons'
import './EmptyState.css'

interface EmptyStateProps {
  message?: string
  description?: string
  icon?: React.ReactNode
}

export default function EmptyState({ 
  message = 'Нет данных', 
  description,
  icon 
}: EmptyStateProps) {
  return (
    <div className="empty-state">
      <div className="empty-state-icon">
        {icon || <InboxOutlined />}
      </div>
      <h3 className="empty-state-title">{message}</h3>
      {description && (
        <p className="empty-state-description">{description}</p>
      )}
    </div>
  )
}

