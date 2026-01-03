import { useEffect, useState } from 'react'
import { useProjectStore } from '../stores/projectStore'
import { useTranscriptionStore } from '../stores/transcriptionStore'
import { ProjectList } from '../components/ProjectList'
import { FileUpload } from '../components/FileUpload'
import { ProgressIndicator } from '../components/ProgressIndicator'
import './Dashboard.css'

export function Dashboard() {
  const { fetchProjects, createProject, error: projectError } = useProjectStore()
  const { startTranscription, isTranscribing } = useTranscriptionStore()

  const [selectedFilePath, setSelectedFilePath] = useState<string | null>(null)
  const [projectTitle, setProjectTitle] = useState('')
  const [projectDescription, setProjectDescription] = useState('')
  const [isCreating, setIsCreating] = useState(false)

  useEffect(() => {
    fetchProjects()
  }, [fetchProjects])

  const handleFileSelected = (filePath: string) => {
    setSelectedFilePath(filePath)
    // ファイル名からプロジェクト名を自動生成
    const fileName = filePath.split('/').pop()?.split('.')[0] || ''
    if (!projectTitle) {
      setProjectTitle(fileName)
    }
  }

  const handleCreateAndTranscribe = async () => {
    if (!selectedFilePath || !projectTitle) {
      return
    }

    setIsCreating(true)
    try {
      // プロジェクトを作成
      const project = await createProject(projectTitle, projectDescription, selectedFilePath)

      // 文字起こしを開始
      await startTranscription(selectedFilePath, project.id)

      // フォームをリセット
      setSelectedFilePath(null)
      setProjectTitle('')
      setProjectDescription('')
    } catch (error) {
      console.error('Failed to create project or start transcription:', error)
    } finally {
      setIsCreating(false)
    }
  }

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <h1>Transcription App</h1>
        <p className="dashboard-subtitle">音声文字起こしアプリケーション</p>
      </header>

      <div className="dashboard-content">
        <section className="create-project-section">
          <h2>新しいプロジェクトを作成</h2>

          <div className="create-project-form">
            <FileUpload
              onFileSelected={handleFileSelected}
              disabled={isTranscribing || isCreating}
            />

            {selectedFilePath && (
              <>
                <div className="form-group">
                  <label htmlFor="project-title">プロジェクト名 *</label>
                  <input
                    id="project-title"
                    type="text"
                    className="form-input"
                    value={projectTitle}
                    onChange={(e) => setProjectTitle(e.target.value)}
                    placeholder="プロジェクト名を入力"
                    disabled={isTranscribing || isCreating}
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="project-description">説明（任意）</label>
                  <textarea
                    id="project-description"
                    className="form-textarea"
                    value={projectDescription}
                    onChange={(e) => setProjectDescription(e.target.value)}
                    placeholder="プロジェクトの説明を入力"
                    rows={3}
                    disabled={isTranscribing || isCreating}
                  />
                </div>

                <button
                  className="btn-primary"
                  onClick={handleCreateAndTranscribe}
                  disabled={!projectTitle || isTranscribing || isCreating}
                >
                  {isCreating ? '作成中...' : isTranscribing ? '文字起こし中...' : 'プロジェクトを作成して文字起こしを開始'}
                </button>
              </>
            )}
          </div>

          <ProgressIndicator />

          {projectError && (
            <div className="error-message">
              <svg
                className="error-icon"
                width="20"
                height="20"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                  clipRule="evenodd"
                />
              </svg>
              <span>{projectError}</span>
            </div>
          )}
        </section>

        <section className="projects-section">
          <ProjectList />
        </section>
      </div>
    </div>
  )
}
