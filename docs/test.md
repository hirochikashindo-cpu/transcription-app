# テスト仕様書 (Test Specification)

## 概要

このドキュメントでは、Transcription Appのテスト戦略、カバレッジ目標、テストケース一覧について説明します。

**テストフレームワーク**:
- **Unit Test**: Vitest
- **E2E Test**: Playwright
- **Mocking**: MSW (Mock Service Worker)

---

## テスト戦略

### テストピラミッド

```
       /\
      /  \     E2E Tests (10%)
     /____\    - Critical user flows
    /      \
   /________\  Integration Tests (30%)
  /          \ - IPC communication
 /____________\  - Database operations
/              \
Unit Tests (60%)
- Business logic
- Utilities
- Components
```

### カバレッジ目標

| フェーズ | 目標カバレッジ | 現実的な目標 |
|---------|--------------|-------------|
| Phase 1 (MVP) | 80% | 70% |
| Phase 2 | 85% | 80% |
| Phase 3 | 90% | 85% |

**カバレッジ測定対象**:
- `electron/services/`: 必須
- `electron/ipc/`: 必須
- `src/components/`: 推奨
- `src/pages/`: 推奨
- `src/store/`: 必須

**カバレッジ除外対象**:
- `electron/main.ts`: E2Eでカバー
- `electron/preload.ts`: E2Eでカバー
- `*.d.ts`: 型定義ファイル
- `vite.config.ts`, `vitest.config.ts`: 設定ファイル

---

## Unit Tests

### 1. DatabaseService

**ファイル**: `tests/unit/services/database-service.test.ts`

```typescript
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import Database from 'better-sqlite3'
import { DatabaseService } from '@/electron/services/database/database-service'

describe('DatabaseService', () => {
  let db: Database.Database
  let service: DatabaseService

  beforeEach(() => {
    // インメモリDBでテスト
    db = new Database(':memory:')
    service = new DatabaseService()
    service.initialize()
  })

  afterEach(() => {
    db.close()
  })

  describe('initialize', () => {
    it('should create database file', () => {
      expect(service.isInitialized()).toBe(true)
    })

    it('should enable foreign keys', () => {
      const result = db.pragma('foreign_keys', { simple: true })
      expect(result).toBe(1)
    })

    it('should create schema_version table', () => {
      const tables = db.prepare(
        "SELECT name FROM sqlite_master WHERE type='table' AND name='schema_version'"
      ).all()
      expect(tables).toHaveLength(1)
    })
  })

  describe('runMigrations', () => {
    it('should run migrations in order', () => {
      const version = db.prepare('SELECT MAX(version) as version FROM schema_version').get()
      expect(version.version).toBe(1)
    })

    it('should skip already applied migrations', () => {
      // 2回初期化しても問題ない
      service.initialize()
      const version = db.prepare('SELECT MAX(version) as version FROM schema_version').get()
      expect(version.version).toBe(1)
    })

    it('should throw error for invalid migration file', () => {
      // 不正なSQLファイルがある場合
      expect(() => {
        // Invalid SQL migration
      }).toThrow('Migration failed')
    })
  })

  describe('getDatabase', () => {
    it('should return database instance', () => {
      const db = service.getDatabase()
      expect(db).toBeDefined()
    })

    it('should throw error if not initialized', () => {
      const uninitializedService = new DatabaseService()
      expect(() => uninitializedService.getDatabase()).toThrow('Database not initialized')
    })
  })

  describe('close', () => {
    it('should close database connection', () => {
      service.close()
      expect(service.isInitialized()).toBe(false)
    })
  })
})
```

---

### 2. ProjectRepository

**ファイル**: `tests/unit/repositories/project-repository.test.ts`

```typescript
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import Database from 'better-sqlite3'
import { ProjectRepository } from '@/electron/services/database/repositories/project-repository'
import type { CreateProjectData } from '@shared/types'

describe('ProjectRepository', () => {
  let db: Database.Database
  let repository: ProjectRepository

  beforeEach(() => {
    db = new Database(':memory:')
    // スキーマ作成
    repository = new ProjectRepository(db)
  })

  afterEach(() => {
    db.close()
  })

  describe('create', () => {
    it('should create a project', () => {
      const data: CreateProjectData = {
        title: 'Test Project',
        audio_file_path: '/path/to/audio.mp3',
        audio_file_name: 'audio.mp3',
      }

      const project = repository.create(data)

      expect(project.id).toBeDefined()
      expect(project.title).toBe('Test Project')
      expect(project.status).toBe('pending')
      expect(project.created_at).toBeInstanceOf(Date)
    })

    it('should generate UUID for id', () => {
      const project = repository.create({
        title: 'Test',
        audio_file_path: '/test.mp3',
        audio_file_name: 'test.mp3',
      })

      expect(project.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i)
    })
  })

  describe('findAll', () => {
    beforeEach(() => {
      repository.create({ title: 'Project 1', audio_file_path: '/test1.mp3', audio_file_name: 'test1.mp3' })
      repository.create({ title: 'Project 2', audio_file_path: '/test2.mp3', audio_file_name: 'test2.mp3' })
    })

    it('should return all projects', () => {
      const projects = repository.findAll()
      expect(projects).toHaveLength(2)
    })

    it('should filter by status', () => {
      const p1 = repository.create({ title: 'P1', audio_file_path: '/test.mp3', audio_file_name: 'test.mp3' })
      repository.update(p1.id, { status: 'completed' })

      const completed = repository.findAll({ status: 'completed' })
      expect(completed).toHaveLength(1)
      expect(completed[0].title).toBe('P1')
    })

    it('should search by title', () => {
      const results = repository.findAll({ search: 'Project 1' })
      expect(results).toHaveLength(1)
      expect(results[0].title).toBe('Project 1')
    })

    it('should return projects in descending order by created_at', () => {
      const projects = repository.findAll()
      expect(new Date(projects[0].created_at).getTime()).toBeGreaterThanOrEqual(
        new Date(projects[1].created_at).getTime()
      )
    })
  })

  describe('findById', () => {
    it('should return project by id', () => {
      const created = repository.create({ title: 'Test', audio_file_path: '/test.mp3', audio_file_name: 'test.mp3' })
      const found = repository.findById(created.id)

      expect(found).toBeDefined()
      expect(found?.id).toBe(created.id)
    })

    it('should return null for non-existent id', () => {
      const found = repository.findById('non-existent-id')
      expect(found).toBeNull()
    })
  })

  describe('update', () => {
    it('should update project title', () => {
      const project = repository.create({ title: 'Original', audio_file_path: '/test.mp3', audio_file_name: 'test.mp3' })
      const updated = repository.update(project.id, { title: 'Updated' })

      expect(updated.title).toBe('Updated')
      expect(updated.updated_at.getTime()).toBeGreaterThan(project.updated_at.getTime())
    })

    it('should update project status', () => {
      const project = repository.create({ title: 'Test', audio_file_path: '/test.mp3', audio_file_name: 'test.mp3' })
      const updated = repository.update(project.id, { status: 'completed' })

      expect(updated.status).toBe('completed')
    })

    it('should not update if no fields provided', () => {
      const project = repository.create({ title: 'Test', audio_file_path: '/test.mp3', audio_file_name: 'test.mp3' })
      const updated = repository.update(project.id, {})

      expect(updated).toEqual(project)
    })
  })

  describe('delete', () => {
    it('should delete project', () => {
      const project = repository.create({ title: 'To Delete', audio_file_path: '/test.mp3', audio_file_name: 'test.mp3' })
      repository.delete(project.id)

      const found = repository.findById(project.id)
      expect(found).toBeNull()
    })
  })

  describe('countByStatus', () => {
    beforeEach(() => {
      const p1 = repository.create({ title: 'P1', audio_file_path: '/test.mp3', audio_file_name: 'test.mp3' })
      repository.update(p1.id, { status: 'completed' })
      repository.create({ title: 'P2', audio_file_path: '/test.mp3', audio_file_name: 'test.mp3' })
      repository.create({ title: 'P3', audio_file_path: '/test.mp3', audio_file_name: 'test.mp3' })
    })

    it('should return count by status', () => {
      const counts = repository.countByStatus()
      expect(counts['completed']).toBe(1)
      expect(counts['pending']).toBe(2)
    })
  })
})
```

---

### 3. React Components

**ファイル**: `tests/unit/components/ProjectCard.test.tsx`

```typescript
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ProjectCard } from '@/components/ProjectCard'
import type { Project } from '@shared/types'

describe('ProjectCard', () => {
  const mockProject: Project = {
    id: '123',
    title: 'Test Project',
    description: 'Test description',
    created_at: new Date('2026-01-03T10:00:00Z'),
    updated_at: new Date('2026-01-03T10:00:00Z'),
    status: 'completed',
    audio_file_path: '/test.mp3',
    audio_file_name: 'test.mp3',
    audio_file_size: 1024,
    audio_duration: 60.5,
    audio_format: 'mp3',
  }

  it('should render project title', () => {
    render(<ProjectCard project={mockProject} onDetail={vi.fn()} onDelete={vi.fn()} />)
    expect(screen.getByText('Test Project')).toBeInTheDocument()
  })

  it('should render status badge', () => {
    render(<ProjectCard project={mockProject} onDetail={vi.fn()} onDelete={vi.fn()} />)
    expect(screen.getByText('完了')).toBeInTheDocument()
  })

  it('should call onDetail when detail button is clicked', () => {
    const onDetail = vi.fn()
    render(<ProjectCard project={mockProject} onDetail={onDetail} onDelete={vi.fn()} />)

    fireEvent.click(screen.getByText('詳細'))
    expect(onDetail).toHaveBeenCalledWith('123')
  })

  it('should call onDelete when delete button is clicked', () => {
    const onDelete = vi.fn()
    render(<ProjectCard project={mockProject} onDetail={vi.fn()} onDelete={onDelete} />)

    fireEvent.click(screen.getByText('削除'))
    expect(onDelete).toHaveBeenCalledWith('123')
  })

  it('should format duration correctly', () => {
    render(<ProjectCard project={mockProject} onDetail={vi.fn()} onDelete={vi.fn()} />)
    expect(screen.getByText('00:01:00')).toBeInTheDocument()
  })
})
```

---

### 4. Zustand Store

**ファイル**: `tests/unit/store/projectStore.test.ts`

```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { useProjectStore } from '@/store/projectStore'

// Mock Electron API
vi.mock('@/lib/electron-api', () => ({
  electronAPI: {
    project: {
      findAll: vi.fn(),
      delete: vi.fn(),
    },
  },
}))

describe('projectStore', () => {
  beforeEach(() => {
    // Reset store
    useProjectStore.setState({
      projects: [],
      filter: 'all',
      searchQuery: '',
    })
  })

  it('should set filter', () => {
    useProjectStore.getState().setFilter('completed')
    expect(useProjectStore.getState().filter).toBe('completed')
  })

  it('should set search query', () => {
    useProjectStore.getState().setSearchQuery('test')
    expect(useProjectStore.getState().searchQuery).toBe('test')
  })

  it('should fetch projects', async () => {
    const mockProjects = [
      { id: '1', title: 'Project 1' },
      { id: '2', title: 'Project 2' },
    ]

    vi.mocked(electronAPI.project.findAll).mockResolvedValue(mockProjects)

    await useProjectStore.getState().fetchProjects()

    expect(useProjectStore.getState().projects).toEqual(mockProjects)
  })

  it('should delete project', async () => {
    useProjectStore.setState({
      projects: [
        { id: '1', title: 'Project 1' },
        { id: '2', title: 'Project 2' },
      ],
    })

    vi.mocked(electronAPI.project.delete).mockResolvedValue()

    await useProjectStore.getState().deleteProject('1')

    expect(useProjectStore.getState().projects).toHaveLength(1)
    expect(useProjectStore.getState().projects[0].id).toBe('2')
  })
})
```

---

## Integration Tests

### 1. IPC Communication

**ファイル**: `tests/integration/ipc-project.test.ts`

```typescript
import { describe, it, expect, beforeEach } from 'vitest'
import { ipcMain, ipcRenderer } from 'electron'
import { registerProjectHandlers } from '@/electron/ipc/project-handler'

describe('Project IPC', () => {
  beforeEach(() => {
    registerProjectHandlers()
  })

  it('should create project via IPC', async () => {
    const data = {
      title: 'IPC Test Project',
      audio_file_path: '/test.mp3',
      audio_file_name: 'test.mp3',
    }

    const project = await ipcRenderer.invoke('project:create', data)

    expect(project.id).toBeDefined()
    expect(project.title).toBe('IPC Test Project')
  })

  it('should handle project not found error', async () => {
    await expect(
      ipcRenderer.invoke('project:findById', 'non-existent-id')
    ).rejects.toThrow('Project not found')
  })
})
```

---

### 2. Database Foreign Key Constraints

**ファイル**: `tests/integration/database-cascade.test.ts`

```typescript
import { describe, it, expect, beforeEach } from 'vitest'
import Database from 'better-sqlite3'
import { ProjectRepository } from '@/electron/services/database/repositories/project-repository'
import { TranscriptionRepository } from '@/electron/services/database/repositories/transcription-repository'

describe('Database Cascade Delete', () => {
  let db: Database.Database
  let projectRepo: ProjectRepository
  let transcriptionRepo: TranscriptionRepository

  beforeEach(() => {
    db = new Database(':memory:')
    db.pragma('foreign_keys = ON')
    // Initialize schema
    projectRepo = new ProjectRepository(db)
    transcriptionRepo = new TranscriptionRepository(db)
  })

  it('should cascade delete transcriptions when project is deleted', () => {
    const project = projectRepo.create({
      title: 'Test',
      audio_file_path: '/test.mp3',
      audio_file_name: 'test.mp3',
    })

    const transcription = transcriptionRepo.create({
      project_id: project.id,
      content: 'Test content',
      language: 'ja',
    })

    // Delete project
    projectRepo.delete(project.id)

    // Transcription should also be deleted
    const found = transcriptionRepo.findById(transcription.id)
    expect(found).toBeNull()
  })
})
```

---

## E2E Tests (Playwright)

### 1. Project Creation Flow

**ファイル**: `tests/e2e/create-project.spec.ts`

```typescript
import { test, expect } from '@playwright/test'

test.describe('Project Creation', () => {
  test('should create a new project', async ({ page }) => {
    await page.goto('/')

    // Click new project button
    await page.click('button:has-text("新規プロジェクト")')

    // Fill form
    await page.fill('input[name="title"]', 'E2E Test Project')
    await page.fill('textarea[name="description"]', 'E2E test description')

    // Select audio file
    await page.setInputFiles('input[type="file"]', 'tests/fixtures/sample.mp3')

    // Submit
    await page.click('button:has-text("作成して開始")')

    // Verify redirect to project detail
    await expect(page).toHaveURL(/\/projects\/[a-f0-9-]+$/)

    // Verify project title
    await expect(page.locator('h1')).toContainText('E2E Test Project')
  })

  test('should show validation error for empty title', async ({ page }) => {
    await page.goto('/projects/new')

    // Submit without title
    await page.click('button:has-text("作成して開始")')

    // Verify error message
    await expect(page.locator('.error')).toContainText('プロジェクト名は必須です')
  })
})
```

---

### 2. Transcription Editing Flow

**ファイル**: `tests/e2e/edit-transcription.spec.ts`

```typescript
import { test, expect } from '@playwright/test'

test.describe('Transcription Editing', () => {
  test('should edit segment text', async ({ page }) => {
    // Navigate to project with completed transcription
    await page.goto('/projects/test-project-id/edit')

    // Find first segment
    const firstSegment = page.locator('[data-testid="segment"]').first()

    // Edit text
    await firstSegment.locator('textarea').fill('Edited text')

    // Save
    await page.click('button:has-text("保存")')

    // Verify success notification
    await expect(page.locator('.toast')).toContainText('保存しました')
  })
})
```

---

## Test Utilities

### Mock Data Generators

**ファイル**: `tests/utils/mock-data.ts`

```typescript
import type { Project, Transcription, Segment } from '@shared/types'

export function createMockProject(overrides?: Partial<Project>): Project {
  return {
    id: '550e8400-e29b-41d4-a716-446655440000',
    title: 'Mock Project',
    description: null,
    created_at: new Date(),
    updated_at: new Date(),
    status: 'completed',
    audio_file_path: '/mock/audio.mp3',
    audio_file_name: 'audio.mp3',
    audio_file_size: 1024,
    audio_duration: 60,
    audio_format: 'mp3',
    ...overrides,
  }
}

export function createMockTranscription(overrides?: Partial<Transcription>): Transcription {
  return {
    id: '660e8400-e29b-41d4-a716-446655440001',
    project_id: '550e8400-e29b-41d4-a716-446655440000',
    content: 'Mock transcription content',
    language: 'ja',
    created_at: new Date(),
    updated_at: new Date(),
    ...overrides,
  }
}

export function createMockSegment(overrides?: Partial<Segment>): Segment {
  return {
    id: '770e8400-e29b-41d4-a716-446655440002',
    transcription_id: '660e8400-e29b-41d4-a716-446655440001',
    start_time: 0.0,
    end_time: 5.0,
    text: 'Mock segment text',
    speaker_id: null,
    confidence: 0.95,
    sequence_number: 1,
    ...overrides,
  }
}
```

---

## Continuous Integration

### GitHub Actions Workflow

```yaml
# .github/workflows/ci.yml
test:
  name: Test
  runs-on: ubuntu-latest
  steps:
    - name: Run unit tests
      run: npm run test

    - name: Generate coverage report
      run: npm run test:coverage

    - name: Upload coverage to Codecov
      uses: codecov/codecov-action@v3
      with:
        files: ./coverage/coverage-final.json
        flags: unittests
        fail_ci_if_error: true
```

---

## Test Commands

```bash
# Unit tests
npm run test              # Run all tests
npm run test:watch        # Watch mode
npm run test:ui           # Vitest UI
npm run test:coverage     # With coverage

# E2E tests
npm run test:e2e          # Run E2E tests
npm run test:e2e:ui       # E2E with UI

# All tests
npm run test:all          # Unit + E2E
```

---

## 参考資料

- [Vitest Documentation](https://vitest.dev/)
- [Playwright Documentation](https://playwright.dev/)
- [Testing Library](https://testing-library.com/docs/react-testing-library/intro/)
- [MSW Documentation](https://mswjs.io/)

---

**最終更新**: 2026-01-03
**バージョン**: 1.0 (Phase 1)
