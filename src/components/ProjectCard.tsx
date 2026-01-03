import { useNavigate } from 'react-router-dom'
import type { Project } from '@shared/types/electron'
import './ProjectCard.css'

interface ProjectCardProps {
  project: Project
  onDelete: (id: string) => void
}

export function ProjectCard({ project, onDelete }: ProjectCardProps) {
  const navigate = useNavigate()

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleString('ja-JP', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const formatDuration = (duration?: number) => {
    if (!duration) return '---'
    const hours = Math.floor(duration / 3600)
    const minutes = Math.floor((duration % 3600) / 60)
    const seconds = Math.floor(duration % 60)

    if (hours > 0) {
      return `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
    }
    return `${minutes}:${String(seconds).padStart(2, '0')}`
  }

  const getStatusBadge = (status: Project['status']) => {
    const badges = {
      pending: { label: '待機中', className: 'status-pending' },
      processing: { label: '処理中', className: 'status-processing' },
      completed: { label: '完了', className: 'status-completed' },
      failed: { label: '失敗', className: 'status-failed' },
    }
    return badges[status]
  }

  const statusBadge = getStatusBadge(project.status)

  return (
    <div className="project-card" onClick={() => navigate(`/project/${project.id}`)}>
      <div className="project-card-header">
        <h3 className="project-card-title">{project.title}</h3>
        <span className={`project-card-status ${statusBadge.className}`}>{statusBadge.label}</span>
      </div>

      {project.description && <p className="project-card-description">{project.description}</p>}

      <div className="project-card-info">
        <div className="info-item">
          <span className="info-label">ファイル:</span>
          <span className="info-value">{project.audio_file_name}</span>
        </div>
        <div className="info-item">
          <span className="info-label">長さ:</span>
          <span className="info-value">{formatDuration(project.audio_duration)}</span>
        </div>
        <div className="info-item">
          <span className="info-label">作成日:</span>
          <span className="info-value">{formatDate(project.created_at)}</span>
        </div>
      </div>

      <div className="project-card-actions">
        <button
          className="btn-secondary"
          onClick={(e) => {
            e.stopPropagation()
            navigate(`/project/${project.id}`)
          }}
        >
          詳細
        </button>
        <button
          className="btn-danger"
          onClick={(e) => {
            e.stopPropagation()
            if (window.confirm(`プロジェクト「${project.title}」を削除しますか？`)) {
              onDelete(project.id)
            }
          }}
        >
          削除
        </button>
      </div>
    </div>
  )
}
