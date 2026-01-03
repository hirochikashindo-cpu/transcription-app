# [Phase 1] ダッシュボードUIと状態管理の実装

## 概要

プロジェクト一覧表示とZustandによる状態管理の実装。

## 実装内容

### 1. Zustand Store

`src/store/project-store.ts`:
```typescript
import { create } from 'zustand'
import type { Project, ProjectFilter } from '@shared/types'

interface ProjectStore {
  projects: Project[]
  filter: ProjectFilter
  loading: boolean
  error: string | null

  // Actions
  loadProjects: () => Promise<void>
  createProject: (data: CreateProjectData) => Promise<void>
  deleteProject: (id: string) => Promise<void>
  setFilter: (filter: ProjectFilter) => void
}

export const useProjectStore = create<ProjectStore>((set, get) => ({
  projects: [],
  filter: {},
  loading: false,
  error: null,

  loadProjects: async () => {
    set({ loading: true, error: null })
    try {
      const projects = await window.electronAPI.project.findAll(get().filter)
      set({ projects, loading: false })
    } catch (error) {
      set({ error: error.message, loading: false })
    }
  },

  createProject: async (data) => {
    const project = await window.electronAPI.project.create(data)
    set((state) => ({ projects: [project, ...state.projects] }))
  },

  deleteProject: async (id) => {
    await window.electronAPI.project.delete(id)
    set((state) => ({
      projects: state.projects.filter((p) => p.id !== id),
    }))
  },

  setFilter: (filter) => {
    set({ filter })
    get().loadProjects()
  },
}))
```

### 2. ダッシュボードコンポーネント

`src/pages/Dashboard.tsx`:
```typescript
import { useEffect } from 'react'
import { useProjectStore } from '@/store/project-store'
import { ProjectCard } from '@/components/ProjectCard'
import { SearchBar } from '@/components/SearchBar'
import { FilterPanel } from '@/components/FilterPanel'

export function Dashboard() {
  const { projects, loading, error, loadProjects } = useProjectStore()

  useEffect(() => {
    loadProjects()
  }, [])

  if (loading) return <div>Loading...</div>
  if (error) return <div>Error: {error}</div>

  return (
    <div className="dashboard">
      <header>
        <h1>Transcription App</h1>
        <button onClick={() => /* ファイル選択 */}>
          新規プロジェクト
        </button>
      </header>

      <SearchBar />
      <FilterPanel />

      <div className="project-grid">
        {projects.map((project) => (
          <ProjectCard key={project.id} project={project} />
        ))}
      </div>
    </div>
  )
}
```

### 3. ProjectCardコンポーネント

`src/components/ProjectCard/ProjectCard.tsx`:
```typescript
import type { Project } from '@shared/types'
import styles from './ProjectCard.module.css'

interface Props {
  project: Project
}

export function ProjectCard({ project }: Props) {
  return (
    <div className={styles.card}>
      <div className={styles.header}>
        <h3>{project.title}</h3>
        <span className={styles.status}>{project.status}</span>
      </div>

      <div className={styles.info}>
        <p>{project.audio_file_name}</p>
        <p>{formatDuration(project.audio_duration)}</p>
      </div>

      <div className={styles.actions}>
        <button>開く</button>
        <button>削除</button>
      </div>
    </div>
  )
}
```

## 受け入れ基準

- [ ] Zustand storeが実装されている
- [ ] ダッシュボードページが実装されている
- [ ] ProjectCardコンポーネントが実装されている
- [ ] プロジェクト一覧が表示される
- [ ] 検索とフィルタが動作する
- [ ] レスポンシブデザイン対応
- [ ] ローディング状態とエラー状態の表示

## ラベル

`priority:p1`, `type:enhancement`, `phase:1`, `component:ui`

## 見積もり

6時間
