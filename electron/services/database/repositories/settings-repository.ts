import Database from 'better-sqlite3'
import type { SettingValue } from '@shared/types/electron'

/**
 * SettingsRepository
 *
 * アプリケーション設定（API Key等）の永続化を担当するリポジトリクラス
 * Key-Valueストアとして機能
 */
export class SettingsRepository {
  constructor(private db: Database.Database) {}

  /**
   * 設定値を取得
   *
   * @param key - 設定キー
   * @returns 設定値、または存在しない場合はnull
   */
  get(key: string): SettingValue | null {
    const stmt = this.db.prepare('SELECT value FROM settings WHERE key = ?')
    const row = stmt.get(key) as { value: string } | undefined

    if (!row) return null

    try {
      return JSON.parse(row.value)
    } catch (error) {
      // JSON parseに失敗した場合は文字列として返す
      return row.value
    }
  }

  /**
   * 設定値を保存
   *
   * @param key - 設定キー
   * @param value - 設定値
   */
  set(key: string, value: SettingValue): void {
    const now = new Date().toISOString()
    const jsonValue = JSON.stringify(value)

    const stmt = this.db.prepare(`
      INSERT INTO settings (key, value, updated_at)
      VALUES (?, ?, ?)
      ON CONFLICT(key) DO UPDATE SET
        value = excluded.value,
        updated_at = excluded.updated_at
    `)

    stmt.run(key, jsonValue, now)
  }

  /**
   * 設定を削除
   *
   * @param key - 設定キー
   */
  delete(key: string): void {
    const stmt = this.db.prepare('DELETE FROM settings WHERE key = ?')
    const result = stmt.run(key)

    if (result.changes === 0) {
      throw new Error(`Setting not found: ${key}`)
    }
  }

  /**
   * すべての設定を取得
   *
   * @returns すべての設定のkey-valueオブジェクト
   */
  getAll(): Record<string, SettingValue> {
    const stmt = this.db.prepare('SELECT key, value FROM settings')
    const rows = stmt.all() as { key: string; value: string }[]

    return rows.reduce(
      (acc, row) => {
        try {
          acc[row.key] = JSON.parse(row.value)
        } catch (error) {
          acc[row.key] = row.value
        }
        return acc
      },
      {} as Record<string, SettingValue>
    )
  }

  /**
   * すべての設定を削除
   */
  clearAll(): void {
    const stmt = this.db.prepare('DELETE FROM settings')
    stmt.run()
  }

  /**
   * 特定のキーが存在するかチェック
   *
   * @param key - 設定キー
   * @returns 存在する場合true
   */
  has(key: string): boolean {
    const stmt = this.db.prepare('SELECT COUNT(*) as count FROM settings WHERE key = ?')
    const result = stmt.get(key) as { count: number }
    return result.count > 0
  }
}
