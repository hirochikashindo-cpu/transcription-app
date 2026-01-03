import { safeStorage } from 'electron'
import { databaseService } from '../database/database-service'

/**
 * KeychainService
 *
 * Electronのsafe Storage APIを使用してAPI Keyなどの機密情報を
 * OSのキーチェーン（macOS Keychain, Windows DPAPI, Linux libsecret）に
 * 安全に保存・取得するサービス
 */
export class KeychainService {
  /**
   * API Keyを安全に保存
   *
   * @param key - 保存するキー名（例: 'OPENAI_API_KEY'）
   * @param value - 保存する値（平文のAPI Key）
   */
  saveApiKey(key: string, value: string): void {
    if (!safeStorage.isEncryptionAvailable()) {
      console.warn(
        'Encryption not available, falling back to plain text storage. ' +
          'This should only happen in development or unsupported environments.'
      )
      this.savePlainText(key, value)
      return
    }

    try {
      const encrypted = safeStorage.encryptString(value)
      const db = databaseService.getDatabase()

      db.prepare(
        `INSERT OR REPLACE INTO settings (key, value, updated_at)
         VALUES (?, ?, datetime('now'))`
      ).run(key, encrypted.toString('base64'))
    } catch (error) {
      console.error('Failed to save API key:', error)
      throw new Error('API Keyの保存に失敗しました')
    }
  }

  /**
   * API Keyを取得
   *
   * @param key - 取得するキー名
   * @returns 復号化されたAPI Key、または存在しない場合はnull
   */
  getApiKey(key: string): string | null {
    try {
      const db = databaseService.getDatabase()
      const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(key) as
        | { value: string }
        | undefined

      if (!row) return null

      // 暗号化が利用できない場合は平文で保存されている
      if (!safeStorage.isEncryptionAvailable()) {
        return row.value
      }

      // Base64からBufferに変換して復号化
      const encrypted = Buffer.from(row.value, 'base64')
      return safeStorage.decryptString(encrypted)
    } catch (error) {
      console.error('Failed to decrypt API key:', error)
      return null
    }
  }

  /**
   * 開発環境用のフォールバック（平文保存）
   *
   * @param key - 保存するキー名
   * @param value - 保存する値
   */
  private savePlainText(key: string, value: string): void {
    const db = databaseService.getDatabase()
    db.prepare(
      `INSERT OR REPLACE INTO settings (key, value, updated_at)
       VALUES (?, ?, datetime('now'))`
    ).run(key, value)
  }

  /**
   * API Keyを削除
   *
   * @param key - 削除するキー名
   */
  deleteApiKey(key: string): void {
    const db = databaseService.getDatabase()
    db.prepare('DELETE FROM settings WHERE key = ?').run(key)
  }

  /**
   * すべてのAPI Keyを削除（リセット用）
   */
  clearAllApiKeys(): void {
    const db = databaseService.getDatabase()
    db.prepare("DELETE FROM settings WHERE key LIKE '%_API_KEY'").run()
  }

  /**
   * 暗号化が利用可能かチェック
   *
   * @returns 暗号化が利用可能な場合true
   */
  isEncryptionAvailable(): boolean {
    return safeStorage.isEncryptionAvailable()
  }
}

export const keychainService = new KeychainService()
