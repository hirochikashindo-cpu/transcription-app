import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useProjectStore } from '../stores/projectStore'
import type { Transcription, Project } from '@shared/types/electron'
import { ExportMenu } from '../components/ExportMenu'
import { SegmentList } from '../components/SegmentList'
import './TranscriptionDetail.css'

export function TranscriptionDetail() {
  const { projectId } = useParams<{ projectId: string }>()
  const navigate = useNavigate()
  const { projects } = useProjectStore()

  const [project, setProject] = useState<Project | null>(null)
  const [transcription, setTranscription] = useState<Transcription | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!projectId) {
      navigate('/')
      return
    }

    loadTranscription()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId])

  const loadTranscription = async () => {
    if (!projectId) return

    setIsLoading(true)
    setError(null)

    try {
      // プロジェクト情報を取得
      const foundProject = projects.find(p => p.id === projectId)
      if (!foundProject) {
        const fetchedProject = await window.electronAPI.project.findById(projectId)
        setProject(fetchedProject)
      } else {
        setProject(foundProject)
      }

      // 文字起こしデータを取得
      const transcriptionData = await window.electronAPI.transcription.getByProjectId(projectId)
      setTranscription(transcriptionData)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load transcription')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSegmentUpdate = async (segmentId: string, newText: string) => {
    try {
      await window.electronAPI.transcription.updateSegment(segmentId, newText)
      // 更新後、再読み込み
      await loadTranscription()
    } catch (err) {
      console.error('Failed to update segment:', err)
      alert('セグメントの更新に失敗しました')
    }
  }

  const formatDuration = (duration?: number) => {
    if (!duration) return '---'
    const hours = Math.floor(duration / 3600)
    const minutes = Math.floor((duration % 3600) / 60)
    const seconds = Math.floor(duration % 60)

    if (hours > 0) {
      return `${hours}時間${minutes}分${seconds}秒`
    }
    return `${minutes}分${seconds}秒`
  }

  if (isLoading) {
    return (
      <div className="transcription-detail">
        <div className="loading-container">
          <div className="spinner"></div>
          <p>読み込み中...</p>
        </div>
      </div>
    )
  }

  if (error || !project) {
    return (
      <div className="transcription-detail">
        <div className="error-container">
          <svg
            className="error-icon"
            width="48"
            height="48"
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
              clipRule="evenodd"
            />
          </svg>
          <p>{error || 'プロジェクトが見つかりません'}</p>
          <button className="btn-primary" onClick={() => navigate('/')}>
            ダッシュボードに戻る
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="transcription-detail">
      <header className="detail-header">
        <button className="btn-back" onClick={() => navigate('/')}>
          <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
            <path
              fillRule="evenodd"
              d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z"
              clipRule="evenodd"
            />
          </svg>
          戻る
        </button>

        <div className="detail-header-content">
          <h1>{project.title}</h1>
          {project.description && <p className="detail-description">{project.description}</p>}
        </div>

        <ExportMenu projectId={projectId!} disabled={!transcription} />
      </header>

      <div className="detail-info-grid">
        <div className="info-card">
          <span className="info-label">音声ファイル</span>
          <span className="info-value">{project.audio_file_name}</span>
        </div>
        <div className="info-card">
          <span className="info-label">長さ</span>
          <span className="info-value">{formatDuration(project.audio_duration)}</span>
        </div>
        <div className="info-card">
          <span className="info-label">言語</span>
          <span className="info-value">{transcription?.language || '---'}</span>
        </div>
        <div className="info-card">
          <span className="info-label">セグメント数</span>
          <span className="info-value">
            {transcription?.segments?.length || 0} 件
          </span>
        </div>
      </div>

      {!transcription && (
        <div className="no-transcription">
          <p>文字起こしデータがありません</p>
          <p className="hint">このプロジェクトの文字起こしがまだ実行されていません</p>
        </div>
      )}

      {transcription && (
        <div className="transcription-content">
          <section className="full-text-section">
            <h2>全文</h2>
            <div className="full-text-content">
              {transcription.content}
            </div>
          </section>

          <section className="segments-section">
            <h2>セグメント</h2>
            <SegmentList
              segments={transcription.segments || []}
              onUpdate={handleSegmentUpdate}
            />
          </section>
        </div>
      )}
    </div>
  )
}
