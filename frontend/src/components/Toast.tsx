import { useEffect } from 'react'
import { CheckCircleOutlined, CloseCircleOutlined, InfoCircleOutlined, ExclamationCircleOutlined } from '@ant-design/icons'
import './Toast.css'

export type ToastType = 'success' | 'error' | 'info' | 'warning'

export interface Toast {
  id: string
  message: string
  type: ToastType
  duration?: number
}

interface ToastProps {
  toast: Toast
  onClose: (id: string) => void
}

export default function ToastComponent({ toast, onClose }: ToastProps) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose(toast.id)
    }, toast.duration || 5000)

    return () => clearTimeout(timer)
  }, [toast.id, toast.duration, onClose])

  const icons = {
    success: <CheckCircleOutlined />,
    error: <CloseCircleOutlined />,
    info: <InfoCircleOutlined />,
    warning: <ExclamationCircleOutlined />,
  }

  return (
    <div className={`toast toast-${toast.type}`} onClick={() => onClose(toast.id)}>
      <div className="toast-icon">{icons[toast.type]}</div>
      <div className="toast-message">{toast.message}</div>
      <button className="toast-close" onClick={(e) => { e.stopPropagation(); onClose(toast.id) }}>
        <CloseCircleOutlined />
      </button>
    </div>
  )
}

