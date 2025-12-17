import { Component, ErrorInfo, ReactNode } from 'react'
import { AlertOutlined } from '@ant-design/icons'
import './ErrorBoundary.css'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = {
      hasError: false,
      error: null,
    }
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
    }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo)
    // Здесь можно отправить ошибку в систему мониторинга (Sentry, LogRocket и т.д.)
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
    })
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }

      return (
        <div className="error-boundary">
          <div className="error-boundary-content">
            <AlertOutlined className="error-boundary-icon" />
            <h2 className="error-boundary-title">Что-то пошло не так</h2>
            <p className="error-boundary-message">
              Произошла непредвиденная ошибка. Пожалуйста, попробуйте обновить страницу.
            </p>
            {import.meta.env.MODE === 'development' && this.state.error && (
              <details className="error-boundary-details">
                <summary>Детали ошибки (только для разработки)</summary>
                <pre className="error-boundary-stack">
                  {this.state.error.toString()}
                  {this.state.error.stack}
                </pre>
              </details>
            )}
            <div className="error-boundary-actions">
              <button
                className="error-boundary-button"
                onClick={this.handleReset}
              >
                Попробовать снова
              </button>
              <button
                className="error-boundary-button"
                onClick={() => window.location.reload()}
              >
                Обновить страницу
              </button>
            </div>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

export default ErrorBoundary

