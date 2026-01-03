# [Phase 1] ProjectRepositoryの実装

## 概要

プロジェクトのCRUD操作を行うRepositoryパターンの実装。データベースアクセスを抽象化し、テスト可能な設計にします。

## 目的

- プロジェクトデータの永続化
- CRUD操作の提供
- トランザクション管理
- エラーハンドリング

## 実装内容

### 1. ProjectRepository実装

`electron/services/database/repositories/project-repository.ts`:
```typescript
import Database from 'better-sqlite3'
import { v4 as uuidv4 } from 'uuid'
import type { Project, CreateProjectData, UpdateProjectData, ProjectFilter } from '@shared/types'

export class ProjectRepository {
  constructor(private db: Database.Database) {}

  /**
   * プロジェクトを作成
   */
  create(data: CreateProjectData): Project {
    const id = uuidv4()
    const now = new Date().toISOString()

    const stmt = this.db.prepare(`
      INSERT INTO projects (
        id, title, description, created_at, updated_at,
        audio_file_path, audio_file_name, audio_file_size,
        audio_duration, audio_format, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')
    `)

    stmt.run(
      id,
      data.title,
      data.description || null,
      now,
      now,
      data.audio_file_path,
      data.audio_file_name,
      data.audio_file_size || null,
      data.audio_duration || null,
      data.audio_format || null
    )

    return this.findById(id)!
  }

  /**
   * プロジェクトを検索
   */
  findAll(filter?: ProjectFilter): Project[] {
    let query = 'SELECT * FROM projects WHERE 1=1'
    const params: any[] = []

    if (filter?.status) {
      query += ' AND status = ?'
      params.push(filter.status)
    }

    if (filter?.search) {
      query += ' AND (title LIKE ? OR description LIKE ?)'
      const searchParam = `%${filter.search}%`
      params.push(searchParam, searchParam)
    }

    query += ' ORDER BY created_at DESC'

    const stmt = this.db.prepare(query)
    const rows = stmt.all(...params) as Project[]

    return rows.map(this.mapRowToProject)
  }

  /**
   * IDでプロジェクトを取得
   */
  findById(id: string): Project | null {
    const stmt = this.db.prepare('SELECT * FROM projects WHERE id = ?')
    const row = stmt.get(id) as any

    if (!row) return null
    return this.mapRowToProject(row)
  }

  /**
   * プロジェクトを更新
   */
  update(id: string, updates: UpdateProjectData): Project {
    const fields: string[] = []
    const params: any[] = []

    if (updates.title !== undefined) {
      fields.push('title = ?')
      params.push(updates.title)
    }

    if (updates.description !== undefined) {
      fields.push('description = ?')
      params.push(updates.description)
    }

    if (updates.status !== undefined) {
      fields.push('status = ?')
      params.push(updates.status)
    }

    if (fields.length === 0) {
      return this.findById(id)!
    }

    fields.push("updated_at = datetime('now')")
    params.push(id)

    const stmt = this.db.prepare(
      `UPDATE projects SET ${fields.join(', ')} WHERE id = ?`
    )
    stmt.run(...params)

    return this.findById(id)!
  }

  /**
   * プロジェクトを削除
   */
  delete(id: string): void {
    const stmt = this.db.prepare('DELETE FROM projects WHERE id = ?')
    stmt.run(id)
  }

  /**
   * ステータス別カウント
   */
  countByStatus(): Record<string, number> {
    const stmt = this.db.prepare(
      'SELECT status, COUNT(*) as count FROM projects GROUP BY status'
    )
    const rows = stmt.all() as { status: string; count: number }[]

    return rows.reduce(
      (acc, row) => {
        acc[row.status] = row.count
        return acc
      },
      {} as Record<string, number>
    )
  }

  /**
   * 行データをProjectオブジェクトにマップ
   */
  private mapRowToProject(row: any): Project {
    return {
      id: row.id,
      title: row.title,
      description: row.description,
      created_at: new Date(row.created_at),
      updated_at: new Date(row.updated_at),
      status: row.status,
      audio_file_path: row.audio_file_path,
      audio_file_name: row.audio_file_name,
      audio_file_size: row.audio_file_size,
      audio_duration: row.audio_duration,
      audio_format: row.audio_format,
    }
  }
}
```

### 2. IPC Handlerの実装

`electron/ipc/project-handler.ts`:
```typescript
import { ipcMain } from 'electron'
import { ProjectRepository } from '../services/database/repositories/project-repository'
import { databaseService } from '../services/database/database-service'
import type { CreateProjectData, UpdateProjectData, ProjectFilter } from '@shared/types'

let projectRepository: ProjectRepository

export function registerProjectHandlers() {
  const db = databaseService.getDatabase()
  projectRepository = new ProjectRepository(db)

  ipcMain.handle('project:create', async (_event, data: CreateProjectData) => {
    try {
      return projectRepository.create(data)
    } catch (error) {
      console.error('Failed to create project:', error)
      throw error
    }
  })

  ipcMain.handle('project:findAll', async (_event, filter?: ProjectFilter) => {
    try {
      return projectRepository.findAll(filter)
    } catch (error) {
      console.error('Failed to find projects:', error)
      throw error
    }
  })

  ipcMain.handle('project:findById', async (_event, id: string) => {
    try {
      const project = projectRepository.findById(id)
      if (!project) {
        throw new Error(`Project not found: ${id}`)
      }
      return project
    } catch (error) {
      console.error('Failed to find project:', error)
      throw error
    }
  })

  ipcMain.handle('project:update', async (_event, id: string, updates: UpdateProjectData) => {
    try {
      return projectRepository.update(id, updates)
    } catch (error) {
      console.error('Failed to update project:', error)
      throw error
    }
  })

  ipcMain.handle('project:delete', async (_event, id: string) => {
    try {
      projectRepository.delete(id)
    } catch (error) {
      console.error('Failed to delete project:', error)
      throw error
    }
  })
}
```

### 3. main.tsで登録

`electron/main.ts`:
```typescript
import { registerProjectHandlers } from './ipc/project-handler'

app.whenReady().then(() => {
  databaseService.initialize()
  registerProjectHandlers() // 追加
  // ...
})
```

## テストケース

`tests/unit/repositories/project-repository.test.ts`:
```typescript
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import Database from 'better-sqlite3'
import { ProjectRepository } from '@electron/services/database/repositories/project-repository'
import type { CreateProjectData } from '@shared/types'

describe('ProjectRepository', () => {
  let db: Database.Database
  let repository: ProjectRepository

  beforeEach(() => {
    db = new Database(':memory:')
    // テーブル作成...
    repository = new ProjectRepository(db)
  })

  afterEach(() => {
    db.close()
  })

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
  })

  it('should find all projects', () => {
    repository.create({ title: 'Project 1', audio_file_path: '/test1.mp3', audio_file_name: 'test1.mp3' })
    repository.create({ title: 'Project 2', audio_file_path: '/test2.mp3', audio_file_name: 'test2.mp3' })

    const projects = repository.findAll()

    expect(projects).toHaveLength(2)
  })

  it('should filter projects by status', () => {
    const p1 = repository.create({ title: 'P1', audio_file_path: '/test1.mp3', audio_file_name: 'test1.mp3' })
    repository.update(p1.id, { status: 'completed' })
    repository.create({ title: 'P2', audio_file_path: '/test2.mp3', audio_file_name: 'test2.mp3' })

    const completed = repository.findAll({ status: 'completed' })

    expect(completed).toHaveLength(1)
    expect(completed[0].title).toBe('P1')
  })

  it('should update a project', () => {
    const project = repository.create({ title: 'Original', audio_file_path: '/test.mp3', audio_file_name: 'test.mp3' })

    const updated = repository.update(project.id, { title: 'Updated' })

    expect(updated.title).toBe('Updated')
  })

  it('should delete a project', () => {
    const project = repository.create({ title: 'To Delete', audio_file_path: '/test.mp3', audio_file_name: 'test.mp3' })

    repository.delete(project.id)

    const found = repository.findById(project.id)
    expect(found).toBeNull()
  })
})
```

## 受け入れ基準

- [ ] ProjectRepositoryクラスが実装されている
- [ ] CRUD操作がすべて動作する
- [ ] IPC Handlerが実装されている
- [ ] エラーハンドリングが適切に実装されている
- [ ] 単体テストが実装され、すべてパスする
- [ ] テストカバレッジが80%以上
- [ ] DateTimeの変換が正しく動作する
- [ ] フィルター機能が動作する

## ラベル

`priority:p1`, `type:enhancement`, `phase:1`, `component:database`

## マイルストーン

Phase 1 - MVP

## 見積もり

- 実装: 4時間
- テスト: 2時間
- 合計: 6時間
