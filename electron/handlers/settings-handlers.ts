import { ipcMain } from 'electron'
import { databaseService } from '../services/database/database-service'
import type { SettingValue } from '@shared/types/electron'

/**
 * 設定管理のIPCハンドラー
 */
export function registerSettingsHandlers(): void {
  /**
   * 設定値を取得
   */
  ipcMain.handle('settings:get', async (_event, key: string): Promise<SettingValue> => {
    const db = databaseService.getDatabase()

    const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(key) as
      | { value: string }
      | undefined

    if (!row) {
      return null
    }

    // JSONとしてパースを試みる
    try {
      return JSON.parse(row.value)
    } catch {
      // パースできない場合は文字列として返す
      return row.value
    }
  })

  /**
   * 設定値を保存
   */
  ipcMain.handle('settings:set', async (_event, key: string, value: SettingValue): Promise<void> => {
    const db = databaseService.getDatabase()

    // オブジェクトの場合はJSON文字列に変換
    const stringValue = typeof value === 'object' ? JSON.stringify(value) : String(value)

    // UPSERT (INSERT OR REPLACE)
    db.prepare(
      `INSERT INTO settings (key, value, updated_at)
       VALUES (?, ?, CURRENT_TIMESTAMP)
       ON CONFLICT(key) DO UPDATE SET
         value = excluded.value,
         updated_at = CURRENT_TIMESTAMP`,
    ).run(key, stringValue)
  })
}
