import Database from 'better-sqlite3'
import { v4 as uuidv4 } from 'uuid'
import type {
  Transcription,
  CreateTranscriptionData,
  UpdateTranscriptionData,
} from '@shared/types/electron'

/**
 * TranscriptionRepository
 *
 * 文字起こしデータの永続化を担当するリポジトリクラス
 * Repositoryパターンを使用してデータベースアクセスを抽象化
 */
export class TranscriptionRepository {
  constructor(private db: Database.Database) {}

  /**
   * 文字起こしを作成
   *
   * @param data - 文字起こし作成データ
   * @returns 作成された文字起こし
   */
  create(data: CreateTranscriptionData): Transcription {
    const id = uuidv4()
    const now = new Date().toISOString()

    const stmt = this.db.prepare(`
      INSERT INTO transcriptions (
        id, project_id, content, language, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?)
    `)

    stmt.run(id, data.project_id, data.content, data.language || 'ja', now, now)

    const transcription = this.findById(id)
    if (!transcription) {
      throw new Error('Failed to create transcription')
    }

    return transcription
  }

  /**
   * IDで文字起こしを取得
   *
   * @param id - 文字起こしID
   * @returns 文字起こし、または存在しない場合はnull
   */
  findById(id: string): Transcription | null {
    const stmt = this.db.prepare('SELECT * FROM transcriptions WHERE id = ?')
    const row = stmt.get(id) as Record<string, unknown> | undefined

    if (!row) return null
    return this.mapRowToTranscription(row)
  }

  /**
   * プロジェクトIDで文字起こしを取得
   *
   * @param projectId - プロジェクトID
   * @returns 文字起こし、または存在しない場合はnull
   */
  findByProjectId(projectId: string): Transcription | null {
    const stmt = this.db.prepare('SELECT * FROM transcriptions WHERE project_id = ?')
    const row = stmt.get(projectId) as Record<string, unknown> | undefined

    if (!row) return null
    return this.mapRowToTranscription(row)
  }

  /**
   * 文字起こしを更新
   *
   * @param id - 文字起こしID
   * @param updates - 更新データ
   * @returns 更新された文字起こし
   */
  update(id: string, updates: UpdateTranscriptionData): Transcription {
    const fields: string[] = []
    const params: (string | number)[] = []

    if (updates.content !== undefined) {
      fields.push('content = ?')
      params.push(updates.content)
    }

    if (updates.language !== undefined) {
      fields.push('language = ?')
      params.push(updates.language)
    }

    if (fields.length === 0) {
      const transcription = this.findById(id)
      if (!transcription) {
        throw new Error(`Transcription not found: ${id}`)
      }
      return transcription
    }

    fields.push("updated_at = datetime('now')")
    params.push(id)

    const stmt = this.db.prepare(`UPDATE transcriptions SET ${fields.join(', ')} WHERE id = ?`)
    stmt.run(...params)

    const transcription = this.findById(id)
    if (!transcription) {
      throw new Error(`Transcription not found after update: ${id}`)
    }

    return transcription
  }

  /**
   * 文字起こしを削除
   *
   * @param id - 文字起こしID
   */
  delete(id: string): void {
    const stmt = this.db.prepare('DELETE FROM transcriptions WHERE id = ?')
    const result = stmt.run(id)

    if (result.changes === 0) {
      throw new Error(`Transcription not found: ${id}`)
    }
  }

  /**
   * プロジェクトIDで文字起こしを削除
   *
   * @param projectId - プロジェクトID
   */
  deleteByProjectId(projectId: string): void {
    const stmt = this.db.prepare('DELETE FROM transcriptions WHERE project_id = ?')
    stmt.run(projectId)
  }

  /**
   * 行データをTranscriptionオブジェクトにマップ
   *
   * @param row - データベース行
   * @returns Transcriptionオブジェクト
   */
  private mapRowToTranscription(row: Record<string, unknown>): Transcription {
    return {
      id: row.id as string,
      project_id: row.project_id as string,
      content: row.content as string,
      language: row.language as string,
      created_at: new Date(row.created_at as string),
      updated_at: new Date(row.updated_at as string),
    }
  }
}
