import Database from 'better-sqlite3'
import { v4 as uuidv4 } from 'uuid'
import type { Segment, CreateSegmentData, UpdateSegmentData } from '@shared/types/electron'

/**
 * SegmentRepository
 *
 * 文字起こしセグメント（タイムスタンプ付きテキスト）の永続化を担当するリポジトリクラス
 * Repositoryパターンを使用してデータベースアクセスを抽象化
 */
export class SegmentRepository {
  constructor(private db: Database.Database) {}

  /**
   * セグメントを作成
   *
   * @param data - セグメント作成データ
   * @returns 作成されたセグメント
   */
  create(data: CreateSegmentData): Segment {
    const id = uuidv4()

    const stmt = this.db.prepare(`
      INSERT INTO segments (
        id, transcription_id, start_time, end_time, text,
        speaker_id, confidence, sequence_number
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `)

    stmt.run(
      id,
      data.transcription_id,
      data.start_time,
      data.end_time,
      data.text,
      data.speaker_id || null,
      data.confidence || null,
      data.sequence_number
    )

    const segment = this.findById(id)
    if (!segment) {
      throw new Error('Failed to create segment')
    }

    return segment
  }

  /**
   * 複数のセグメントを一括作成（トランザクション使用）
   *
   * @param segments - セグメント作成データの配列
   * @returns 作成されたセグメントの配列
   */
  createBatch(segments: CreateSegmentData[]): Segment[] {
    const stmt = this.db.prepare(`
      INSERT INTO segments (
        id, transcription_id, start_time, end_time, text,
        speaker_id, confidence, sequence_number
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `)

    const insertMany = this.db.transaction((items: CreateSegmentData[]) => {
      const ids: string[] = []
      for (const item of items) {
        const id = uuidv4()
        stmt.run(
          id,
          item.transcription_id,
          item.start_time,
          item.end_time,
          item.text,
          item.speaker_id || null,
          item.confidence || null,
          item.sequence_number
        )
        ids.push(id)
      }
      return ids
    })

    insertMany(segments)

    // 作成されたセグメントを取得
    return this.findByTranscriptionId(segments[0].transcription_id)
  }

  /**
   * IDでセグメントを取得
   *
   * @param id - セグメントID
   * @returns セグメント、または存在しない場合はnull
   */
  findById(id: string): Segment | null {
    const stmt = this.db.prepare('SELECT * FROM segments WHERE id = ?')
    const row = stmt.get(id) as Record<string, unknown> | undefined

    if (!row) return null
    return this.mapRowToSegment(row)
  }

  /**
   * 文字起こしIDでセグメント一覧を取得
   *
   * @param transcriptionId - 文字起こしID
   * @returns セグメントの配列（sequence_number順）
   */
  findByTranscriptionId(transcriptionId: string): Segment[] {
    const stmt = this.db.prepare(
      'SELECT * FROM segments WHERE transcription_id = ? ORDER BY sequence_number ASC'
    )
    const rows = stmt.all(transcriptionId) as Array<Record<string, unknown>>

    return rows.map((row) => this.mapRowToSegment(row))
  }

  /**
   * セグメントを更新
   *
   * @param id - セグメントID
   * @param updates - 更新データ
   * @returns 更新されたセグメント
   */
  update(id: string, updates: UpdateSegmentData): Segment {
    const fields: string[] = []
    const params: (string | null)[] = []

    if (updates.text !== undefined) {
      fields.push('text = ?')
      params.push(updates.text)
    }

    if (updates.speaker_id !== undefined) {
      fields.push('speaker_id = ?')
      params.push(updates.speaker_id || null)
    }

    if (fields.length === 0) {
      const segment = this.findById(id)
      if (!segment) {
        throw new Error(`Segment not found: ${id}`)
      }
      return segment
    }

    params.push(id)

    const stmt = this.db.prepare(`UPDATE segments SET ${fields.join(', ')} WHERE id = ?`)
    stmt.run(...params)

    const segment = this.findById(id)
    if (!segment) {
      throw new Error(`Segment not found after update: ${id}`)
    }

    return segment
  }

  /**
   * セグメントを削除
   *
   * @param id - セグメントID
   */
  delete(id: string): void {
    const stmt = this.db.prepare('DELETE FROM segments WHERE id = ?')
    const result = stmt.run(id)

    if (result.changes === 0) {
      throw new Error(`Segment not found: ${id}`)
    }
  }

  /**
   * 文字起こしIDでセグメントを削除
   *
   * @param transcriptionId - 文字起こしID
   */
  deleteByTranscriptionId(transcriptionId: string): void {
    const stmt = this.db.prepare('DELETE FROM segments WHERE transcription_id = ?')
    stmt.run(transcriptionId)
  }

  /**
   * 行データをSegmentオブジェクトにマップ
   *
   * @param row - データベース行
   * @returns Segmentオブジェクト
   */
  private mapRowToSegment(row: Record<string, unknown>): Segment {
    return {
      id: row.id as string,
      transcription_id: row.transcription_id as string,
      start_time: row.start_time as number,
      end_time: row.end_time as number,
      text: row.text as string,
      speaker_id: (row.speaker_id as string) || undefined,
      confidence: (row.confidence as number) || undefined,
      sequence_number: row.sequence_number as number,
    }
  }
}
