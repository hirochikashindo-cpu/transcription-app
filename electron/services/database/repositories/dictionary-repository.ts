import Database from 'better-sqlite3'
import { v4 as uuidv4 } from 'uuid'
import type {
  DictionaryEntry,
  CreateDictionaryEntryData,
  UpdateDictionaryEntryData,
  DictionaryFilter,
} from '@shared/types/electron'

/**
 * DictionaryRepository
 *
 * カスタム辞書データの永続化を担当するリポジトリクラス
 * Repositoryパターンを使用してデータベースアクセスを抽象化
 */
export class DictionaryRepository {
  constructor(private db: Database.Database) {}

  /**
   * 辞書エントリを作成
   *
   * @param data - 辞書エントリ作成データ
   * @returns 作成された辞書エントリ
   */
  create(data: CreateDictionaryEntryData): DictionaryEntry {
    const id = uuidv4()
    const now = new Date().toISOString()

    const stmt = this.db.prepare(`
      INSERT INTO custom_dictionaries (
        id, word, reading, category, usage_count, created_at, updated_at
      ) VALUES (?, ?, ?, ?, 0, ?, ?)
    `)

    try {
      stmt.run(id, data.word, data.reading || null, data.category || null, now, now)
    } catch (error) {
      if (error instanceof Error && error.message.includes('UNIQUE constraint failed')) {
        throw new Error(`Word already exists in dictionary: ${data.word}`)
      }
      throw error
    }

    const entry = this.findById(id)
    if (!entry) {
      throw new Error('Failed to create dictionary entry')
    }

    return entry
  }

  /**
   * 辞書エントリを検索
   *
   * @param filter - 検索フィルター（オプション）
   * @returns 辞書エントリの配列
   */
  findAll(filter?: DictionaryFilter): DictionaryEntry[] {
    let query = 'SELECT * FROM custom_dictionaries WHERE 1=1'
    const params: string[] = []

    if (filter?.category) {
      query += ' AND category = ?'
      params.push(filter.category)
    }

    if (filter?.search) {
      query += ' AND (word LIKE ? OR reading LIKE ?)'
      const searchParam = `%${filter.search}%`
      params.push(searchParam, searchParam)
    }

    query += ' ORDER BY word ASC'

    const stmt = this.db.prepare(query)
    const rows = stmt.all(...params) as Array<Record<string, unknown>>

    return rows.map((row) => this.mapRowToDictionaryEntry(row))
  }

  /**
   * IDで辞書エントリを取得
   *
   * @param id - 辞書エントリID
   * @returns 辞書エントリ、または存在しない場合はnull
   */
  findById(id: string): DictionaryEntry | null {
    const stmt = this.db.prepare('SELECT * FROM custom_dictionaries WHERE id = ?')
    const row = stmt.get(id) as Record<string, unknown> | undefined

    if (!row) return null

    return this.mapRowToDictionaryEntry(row)
  }

  /**
   * 単語で辞書エントリを取得
   *
   * @param word - 単語
   * @returns 辞書エントリ、または存在しない場合はnull
   */
  findByWord(word: string): DictionaryEntry | null {
    const stmt = this.db.prepare('SELECT * FROM custom_dictionaries WHERE word = ?')
    const row = stmt.get(word) as Record<string, unknown> | undefined

    if (!row) return null

    return this.mapRowToDictionaryEntry(row)
  }

  /**
   * 辞書エントリを更新
   *
   * @param id - 辞書エントリID
   * @param updates - 更新データ
   * @returns 更新された辞書エントリ
   */
  update(id: string, updates: UpdateDictionaryEntryData): DictionaryEntry {
    const now = new Date().toISOString()
    const fields: string[] = []
    const values: (string | null)[] = []

    if (updates.word !== undefined) {
      fields.push('word = ?')
      values.push(updates.word)
    }

    if (updates.reading !== undefined) {
      fields.push('reading = ?')
      values.push(updates.reading || null)
    }

    if (updates.category !== undefined) {
      fields.push('category = ?')
      values.push(updates.category || null)
    }

    if (fields.length === 0) {
      const entry = this.findById(id)
      if (!entry) {
        throw new Error(`Dictionary entry not found: ${id}`)
      }
      return entry
    }

    fields.push('updated_at = ?')
    values.push(now)
    values.push(id)

    const stmt = this.db.prepare(`UPDATE custom_dictionaries SET ${fields.join(', ')} WHERE id = ?`)

    try {
      stmt.run(...values)
    } catch (error) {
      if (error instanceof Error && error.message.includes('UNIQUE constraint failed')) {
        throw new Error(`Word already exists in dictionary: ${updates.word}`)
      }
      throw error
    }

    const entry = this.findById(id)
    if (!entry) {
      throw new Error(`Dictionary entry not found after update: ${id}`)
    }

    return entry
  }

  /**
   * 辞書エントリを削除
   *
   * @param id - 辞書エントリID
   */
  delete(id: string): void {
    const stmt = this.db.prepare('DELETE FROM custom_dictionaries WHERE id = ?')
    const result = stmt.run(id)

    if (result.changes === 0) {
      throw new Error(`Dictionary entry not found: ${id}`)
    }
  }

  /**
   * 使用回数をインクリメント
   *
   * @param id - 辞書エントリID
   * @returns 更新された辞書エントリ
   */
  incrementUsage(id: string): DictionaryEntry {
    const now = new Date().toISOString()
    const stmt = this.db.prepare(`
      UPDATE custom_dictionaries
      SET usage_count = usage_count + 1, updated_at = ?
      WHERE id = ?
    `)

    stmt.run(now, id)

    const entry = this.findById(id)
    if (!entry) {
      throw new Error(`Dictionary entry not found: ${id}`)
    }

    return entry
  }

  /**
   * カテゴリ一覧を取得
   *
   * @returns カテゴリの配列（重複なし、nullを除く）
   */
  getCategories(): string[] {
    const stmt = this.db.prepare(`
      SELECT DISTINCT category
      FROM custom_dictionaries
      WHERE category IS NOT NULL
      ORDER BY category ASC
    `)
    const rows = stmt.all() as Array<{ category: string }>

    return rows.map((row) => row.category)
  }

  /**
   * データベースの行をDictionaryEntryオブジェクトにマッピング
   *
   * @param row - データベースの行
   * @returns DictionaryEntryオブジェクト
   */
  private mapRowToDictionaryEntry(row: Record<string, unknown>): DictionaryEntry {
    return {
      id: row.id as string,
      word: row.word as string,
      reading: row.reading ? (row.reading as string) : undefined,
      category: row.category ? (row.category as string) : undefined,
      usage_count: row.usage_count as number,
      created_at: new Date(row.created_at as string),
      updated_at: new Date(row.updated_at as string),
    }
  }
}
