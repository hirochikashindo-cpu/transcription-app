import { ipcMain } from 'electron'
import { v4 as uuidv4 } from 'uuid'
import { databaseService } from '../services/database/database-service'
import { fileService } from '../services/file/file-service'
import type { Project, CreateProjectData, UpdateProjectData, ProjectFilter } from '@shared/types/electron'
import type { ProjectRow } from '@shared/types/database'

/**
 * プロジェクト管理のIPCハンドラー
 */
export function registerProjectHandlers(): void {
  /**
   * プロジェクトを作成
   */
  ipcMain.handle('project:create', async (_event, data: CreateProjectData): Promise<Project> => {
    const db = databaseService.getDatabase()

    // ファイル情報を取得
    const fileInfo = await fileService.getFileInfo(data.audio_file_path)

    const projectId = uuidv4()
    const now = new Date().toISOString()

    db.prepare(
      `INSERT INTO projects (
        id, title, description, created_at, updated_at, status,
        audio_file_path, audio_file_name, audio_file_size, audio_duration, audio_format
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run(
      projectId,
      data.title,
      data.description || null,
      now,
      now,
      'pending',
      data.audio_file_path,
      fileInfo.name,
      fileInfo.size,
      data.audio_duration || null,
      fileInfo.extension,
    )

    const project: Project = {
      id: projectId,
      title: data.title,
      description: data.description,
      created_at: new Date(now),
      updated_at: new Date(now),
      status: 'pending',
      audio_file_path: data.audio_file_path,
      audio_file_name: fileInfo.name,
      audio_file_size: fileInfo.size,
      audio_duration: data.audio_duration,
      audio_format: fileInfo.extension,
    }

    return project
  })

  /**
   * プロジェクト一覧を取得
   */
  ipcMain.handle('project:findAll', async (_event, filter?: ProjectFilter): Promise<Project[]> => {
    const db = databaseService.getDatabase()

    let query = 'SELECT * FROM projects WHERE 1=1'
    const params: (string | number)[] = []

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

    const rows = db.prepare(query).all(...params) as ProjectRow[]

    const projects: Project[] = rows.map((row) => ({
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
    }))

    return projects
  })

  /**
   * プロジェクトをIDで取得
   */
  ipcMain.handle('project:findById', async (_event, id: string): Promise<Project> => {
    const db = databaseService.getDatabase()

    const row = db.prepare('SELECT * FROM projects WHERE id = ?').get(id) as ProjectRow | undefined

    if (!row) {
      throw new Error(`Project not found: ${id}`)
    }

    const project: Project = {
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

    return project
  })

  /**
   * プロジェクトを更新
   */
  ipcMain.handle(
    'project:update',
    async (_event, id: string, updates: UpdateProjectData): Promise<Project> => {
      const db = databaseService.getDatabase()

      const setClauses: string[] = []
      const params: (string | number)[] = []

      if (updates.title !== undefined) {
        setClauses.push('title = ?')
        params.push(updates.title)
      }

      if (updates.description !== undefined) {
        setClauses.push('description = ?')
        params.push(updates.description)
      }

      if (updates.status !== undefined) {
        setClauses.push('status = ?')
        params.push(updates.status)
      }

      setClauses.push('updated_at = CURRENT_TIMESTAMP')

      if (setClauses.length === 1) {
        // updated_atのみの更新
        throw new Error('No fields to update')
      }

      params.push(id)

      const query = `UPDATE projects SET ${setClauses.join(', ')} WHERE id = ?`
      db.prepare(query).run(...params)

      // 更新されたプロジェクトを取得
      const row = db.prepare('SELECT * FROM projects WHERE id = ?').get(id) as ProjectRow | undefined

      if (!row) {
        throw new Error(`Project not found: ${id}`)
      }

      const project: Project = {
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

      return project
    },
  )

  /**
   * プロジェクトを削除
   */
  ipcMain.handle('project:delete', async (_event, id: string): Promise<void> => {
    const db = databaseService.getDatabase()

    const result = db.prepare('DELETE FROM projects WHERE id = ?').run(id)

    if (result.changes === 0) {
      throw new Error(`Project not found: ${id}`)
    }
  })
}
