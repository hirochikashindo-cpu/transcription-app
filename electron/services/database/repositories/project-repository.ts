import Database from 'better-sqlite3'
import { v4 as uuidv4 } from 'uuid'
import type {
  Project,
  CreateProjectData,
  UpdateProjectData,
  ProjectFilter,
} from '@shared/types/electron'

/**
 * ProjectRepository
 *
 * プロジェクトデータの永続化を担当するリポジトリクラス
 * Repositoryパターンを使用してデータベースアクセスを抽象化
 */
export class ProjectRepository {
  constructor(private db: Database.Database) {}

  /**
   * プロジェクトを作成
   *
   * @param data - プロジェクト作成データ
   * @returns 作成されたプロジェクト
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
      data.audio_file_name || null,
      data.audio_file_size || null,
      data.audio_duration || null,
      data.audio_format || null
    )

    const project = this.findById(id)
    if (!project) {
      throw new Error('Failed to create project')
    }

    return project
  }

  /**
   * プロジェクトを検索
   *
   * @param filter - 検索フィルター（オプション）
   * @returns プロジェクトの配列
   */
  findAll(filter?: ProjectFilter): Project[] {
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

    // ソート
    const sortBy = filter?.sortBy || 'created_at'
    const sortOrder = filter?.sortOrder || 'desc'
    query += ` ORDER BY ${sortBy} ${sortOrder.toUpperCase()}`

    const stmt = this.db.prepare(query)
    const rows = stmt.all(...params) as Array<Record<string, unknown>>

    return rows.map((row) => this.mapRowToProject(row))
  }

  /**
   * IDでプロジェクトを取得
   *
   * @param id - プロジェクトID
   * @returns プロジェクト、または存在しない場合はnull
   */
  findById(id: string): Project | null {
    const stmt = this.db.prepare('SELECT * FROM projects WHERE id = ?')
    const row = stmt.get(id) as Record<string, unknown> | undefined

    if (!row) return null
    return this.mapRowToProject(row)
  }

  /**
   * プロジェクトを更新
   *
   * @param id - プロジェクトID
   * @param updates - 更新データ
   * @returns 更新されたプロジェクト
   */
  update(id: string, updates: UpdateProjectData): Project {
    const fields: string[] = []
    const params: (string | number)[] = []

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
      const project = this.findById(id)
      if (!project) {
        throw new Error(`Project not found: ${id}`)
      }
      return project
    }

    fields.push("updated_at = datetime('now')")
    params.push(id)

    const stmt = this.db.prepare(`UPDATE projects SET ${fields.join(', ')} WHERE id = ?`)
    stmt.run(...params)

    const project = this.findById(id)
    if (!project) {
      throw new Error(`Project not found after update: ${id}`)
    }

    return project
  }

  /**
   * プロジェクトを削除
   *
   * @param id - プロジェクトID
   */
  delete(id: string): void {
    const stmt = this.db.prepare('DELETE FROM projects WHERE id = ?')
    const result = stmt.run(id)

    if (result.changes === 0) {
      throw new Error(`Project not found: ${id}`)
    }
  }

  /**
   * ステータス別カウント
   *
   * @returns ステータスごとのプロジェクト数
   */
  countByStatus(): Record<string, number> {
    const stmt = this.db.prepare('SELECT status, COUNT(*) as count FROM projects GROUP BY status')
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
   * 全プロジェクト数を取得
   *
   * @returns プロジェクトの総数
   */
  count(): number {
    const stmt = this.db.prepare('SELECT COUNT(*) as count FROM projects')
    const result = stmt.get() as { count: number }
    return result.count
  }

  /**
   * 行データをProjectオブジェクトにマップ
   *
   * @param row - データベース行
   * @returns Projectオブジェクト
   */
  private mapRowToProject(row: Record<string, unknown>): Project {
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
