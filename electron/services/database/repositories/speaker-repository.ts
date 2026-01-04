import Database from 'better-sqlite3'
import { v4 as uuidv4 } from 'uuid'
import type { Speaker, CreateSpeakerData, UpdateSpeakerData } from '@shared/types/electron'

/**
 * SpeakerRepository
 *
 * 話者データの永続化を担当するリポジトリクラス
 * Repositoryパターンを使用してデータベースアクセスを抽象化
 */
export class SpeakerRepository {
  constructor(private db: Database.Database) {}

  /**
   * 話者を作成
   *
   * @param data - 話者作成データ
   * @returns 作成された話者
   */
  create(data: CreateSpeakerData): Speaker {
    const id = uuidv4()
    const now = new Date().toISOString()

    const stmt = this.db.prepare(`
      INSERT INTO speakers (
        id, project_id, name, custom_name, color, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `)

    stmt.run(
      id,
      data.project_id,
      data.name,
      data.custom_name || null,
      data.color,
      now,
      now
    )

    const speaker = this.findById(id)
    if (!speaker) {
      throw new Error('Failed to create speaker')
    }

    return speaker
  }

  /**
   * プロジェクトIDで話者を取得
   *
   * @param projectId - プロジェクトID
   * @returns 話者の配列
   */
  findByProjectId(projectId: string): Speaker[] {
    const stmt = this.db.prepare('SELECT * FROM speakers WHERE project_id = ? ORDER BY name')
    const rows = stmt.all(projectId) as Array<Record<string, unknown>>

    return rows.map((row) => this.mapRowToSpeaker(row))
  }

  /**
   * IDで話者を取得
   *
   * @param id - 話者ID
   * @returns 話者、または存在しない場合はnull
   */
  findById(id: string): Speaker | null {
    const stmt = this.db.prepare('SELECT * FROM speakers WHERE id = ?')
    const row = stmt.get(id) as Record<string, unknown> | undefined

    if (!row) return null

    return this.mapRowToSpeaker(row)
  }

  /**
   * 話者を更新
   *
   * @param id - 話者ID
   * @param updates - 更新データ
   * @returns 更新された話者
   */
  update(id: string, updates: UpdateSpeakerData): Speaker {
    const now = new Date().toISOString()
    const fields: string[] = []
    const values: (string | number)[] = []

    if (updates.custom_name !== undefined) {
      fields.push('custom_name = ?')
      values.push(updates.custom_name || null)
    }

    if (updates.color !== undefined) {
      fields.push('color = ?')
      values.push(updates.color)
    }

    if (fields.length === 0) {
      const speaker = this.findById(id)
      if (!speaker) {
        throw new Error(`Speaker not found: ${id}`)
      }
      return speaker
    }

    fields.push('updated_at = ?')
    values.push(now)
    values.push(id)

    const stmt = this.db.prepare(`UPDATE speakers SET ${fields.join(', ')} WHERE id = ?`)
    stmt.run(...values)

    const speaker = this.findById(id)
    if (!speaker) {
      throw new Error(`Speaker not found after update: ${id}`)
    }

    return speaker
  }

  /**
   * 話者を削除
   *
   * @param id - 話者ID
   */
  delete(id: string): void {
    const stmt = this.db.prepare('DELETE FROM speakers WHERE id = ?')
    const result = stmt.run(id)

    if (result.changes === 0) {
      throw new Error(`Speaker not found: ${id}`)
    }
  }

  /**
   * データベースの行をSpeakerオブジェクトにマッピング
   *
   * @param row - データベースの行
   * @returns Speakerオブジェクト
   */
  private mapRowToSpeaker(row: Record<string, unknown>): Speaker {
    return {
      id: row.id as string,
      project_id: row.project_id as string,
      name: row.name as string,
      custom_name: row.custom_name ? (row.custom_name as string) : undefined,
      color: row.color as string,
      created_at: new Date(row.created_at as string),
      updated_at: new Date(row.updated_at as string),
    }
  }
}
