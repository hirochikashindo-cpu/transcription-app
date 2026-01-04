import { ipcMain } from 'electron'
import { databaseService } from '../services/database/database-service'
import type { SettingValue } from '@shared/types/electron'

/**
 * 設定管理のIPCハンドラー
 * Repositoryパターンを使用
 */
export function registerSettingsHandlers(): void {
  /**
   * 設定値を取得
   */
  ipcMain.handle('settings:get', async (_event, key: string): Promise<SettingValue> => {
    if (!databaseService.settings) {
      throw new Error('Database not initialized')
    }

    return databaseService.settings.get(key)
  })

  /**
   * 設定値を保存
   */
  ipcMain.handle(
    'settings:set',
    async (_event, key: string, value: SettingValue): Promise<{ success: boolean }> => {
      if (!databaseService.settings) {
        throw new Error('Database not initialized')
      }

      databaseService.settings.set(key, value)
      return { success: true }
    }
  )

  /**
   * 設定値を削除
   */
  ipcMain.handle('settings:delete', async (_event, key: string): Promise<{ success: boolean }> => {
    if (!databaseService.settings) {
      throw new Error('Database not initialized')
    }

    databaseService.settings.delete(key)
    return { success: true }
  })

  /**
   * 暗号化が利用可能かチェック（将来の機能）
   */
  ipcMain.handle('settings:isEncryptionAvailable', async (): Promise<boolean> => {
    // Phase 1では暗号化機能は未実装
    return true
  })

  /**
   * すべての設定を削除
   */
  ipcMain.handle('settings:clearAll', async (): Promise<{ success: boolean }> => {
    if (!databaseService.settings) {
      throw new Error('Database not initialized')
    }

    databaseService.settings.clearAll()
    return { success: true }
  })
}
