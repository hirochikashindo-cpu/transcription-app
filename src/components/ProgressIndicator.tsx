import { useEffect } from 'react'
import { useTranscriptionStore } from '../stores/transcriptionStore'
import './ProgressIndicator.css'

export function ProgressIndicator() {
  const { currentProgress, isTranscribing } = useTranscriptionStore()

  useEffect(() => {
    // コンポーネントがアンマウントされる時にプログレスをクリア
    return () => {
      if (currentProgress?.status === 'completed' || currentProgress?.status === 'failed') {
        useTranscriptionStore.getState().clearProgress()
      }
    }
  }, [currentProgress])

  if (!currentProgress && !isTranscribing) {
    return null
  }

  const { status, progress, error } = currentProgress || { status: 'processing', progress: 0 }

  const getStatusColor = () => {
    switch (status) {
      case 'processing':
        return 'blue'
      case 'completed':
        return 'green'
      case 'failed':
        return 'red'
      default:
        return 'gray'
    }
  }

  const getStatusText = () => {
    switch (status) {
      case 'processing':
        return '処理中...'
      case 'completed':
        return '完了'
      case 'failed':
        return 'エラー'
      default:
        return '待機中'
    }
  }

  return (
    <div className={`progress-indicator progress-${getStatusColor()}`}>
      <div className="progress-header">
        <span className="progress-status">{getStatusText()}</span>
        <span className="progress-percentage">{Math.round(progress)}%</span>
      </div>

      <div className="progress-bar-container">
        <div className="progress-bar" style={{ width: `${progress}%` }} />
      </div>

      {error && (
        <div className="progress-error">
          <svg
            className="error-icon"
            width="16"
            height="16"
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
              clipRule="evenodd"
            />
          </svg>
          <span>{error}</span>
        </div>
      )}
    </div>
  )
}
