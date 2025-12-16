import { ExclamationCircleOutlined } from '@ant-design/icons'
import './ConfirmDialog.css'

interface ConfirmDialogProps {
  isOpen: boolean
  title: string
  message: string
  confirmText?: string
  cancelText?: string
  onConfirm: () => void
  onCancel: () => void
  type?: 'danger' | 'warning' | 'info'
}

export default function ConfirmDialog({
  isOpen,
  title,
  message,
  confirmText = 'Подтвердить',
  cancelText = 'Отмена',
  onConfirm,
  onCancel,
  type = 'warning',
}: ConfirmDialogProps) {
  if (!isOpen) return null

  return (
    <>
      <div className="confirm-dialog-overlay" onClick={onCancel} />
      <div className={`confirm-dialog confirm-dialog-${type}`}>
        <div className="confirm-dialog-icon">
          <ExclamationCircleOutlined />
        </div>
        <h3 className="confirm-dialog-title">{title}</h3>
        <p className="confirm-dialog-message">{message}</p>
        <div className="confirm-dialog-actions">
          <button className="confirm-dialog-button cancel" onClick={onCancel}>
            {cancelText}
          </button>
          <button className="confirm-dialog-button confirm" onClick={onConfirm}>
            {confirmText}
          </button>
        </div>
      </div>
    </>
  )
}

