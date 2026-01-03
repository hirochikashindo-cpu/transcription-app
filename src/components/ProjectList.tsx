import { useState } from 'react'
import { useProjectStore } from '../stores/projectStore'
import { ProjectCard } from './ProjectCard'
import './ProjectList.css'

export function ProjectList() {
  const { projects, filter, setFilter, deleteProject, isLoading } = useProjectStore()
  const [searchTerm, setSearchTerm] = useState(filter.search || '')
  const [statusFilter, setStatusFilter] = useState<string>(filter.status || 'all')

  const handleSearchChange = (value: string) => {
    setSearchTerm(value)
    setFilter({
      ...filter,
      search: value || undefined
    })
  }

  const handleStatusFilterChange = (value: string) => {
    setStatusFilter(value)
    setFilter({
      ...filter,
      status: value === 'all' ? undefined : (value as 'pending' | 'processing' | 'completed' | 'failed')
    })
  }

  return (
    <div className="project-list">
      <div className="project-list-header">
        <h2>プロジェクト一覧</h2>

        <div className="project-list-filters">
          <div className="filter-group">
            <input
              type="text"
              className="search-input"
              placeholder="プロジェクトを検索..."
              value={searchTerm}
              onChange={(e) => handleSearchChange(e.target.value)}
            />
          </div>

          <div className="filter-group">
            <select
              className="status-filter"
              value={statusFilter}
              onChange={(e) => handleStatusFilterChange(e.target.value)}
            >
              <option value="all">すべてのステータス</option>
              <option value="pending">待機中</option>
              <option value="processing">処理中</option>
              <option value="completed">完了</option>
              <option value="failed">失敗</option>
            </select>
          </div>
        </div>
      </div>

      {isLoading && (
        <div className="project-list-loading">
          <div className="spinner"></div>
          <p>読み込み中...</p>
        </div>
      )}

      {!isLoading && projects.length === 0 && (
        <div className="project-list-empty">
          <svg
            className="empty-icon"
            width="64"
            height="64"
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" />
            <path
              fillRule="evenodd"
              d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z"
              clipRule="evenodd"
            />
          </svg>
          <p>プロジェクトがありません</p>
          <p className="empty-hint">音声ファイルを選択して新しいプロジェクトを作成してください</p>
        </div>
      )}

      {!isLoading && projects.length > 0 && (
        <div className="project-list-grid">
          {projects.map((project) => (
            <ProjectCard
              key={project.id}
              project={project}
              onDelete={deleteProject}
            />
          ))}
        </div>
      )}
    </div>
  )
}
