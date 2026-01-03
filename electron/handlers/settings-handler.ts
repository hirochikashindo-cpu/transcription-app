import { ipcMain } from 'electron'
import { keychainService } from '../services/settings/keychain-service'
import { configService } from '../services/config/config-service'

/**
 * Settings関連のIPC Handlerを登録
 */
export function registerSettingsHandlers(): void {
  /**
   * 設定値を取得
   */
  ipcMain.handle('settings:get', async (_event, key: string) => {
    try {
      return keychainService.getApiKey(key)
    } catch (error) {
      console.error(`Failed to get setting ${key}:`, error)
      throw new Error(`設定の取得に失敗しました: ${key}`)
    }
  })

  /**
   * 設定値を保存
   */
  ipcMain.handle('settings:set', async (_event, key: string, value: string) => {
    try {
      // API Keyのバリデーション
      if (!value || value.trim().length === 0) {
        throw new Error('API Keyが空です')
      }

      // OpenAI API Keyの形式チェック
      if (key === 'OPENAI_API_KEY' && !value.startsWith('sk-')) {
        throw new Error('OpenAI API Keyは "sk-" で始まる必要があります')
      }

      keychainService.saveApiKey(key, value)

      // ConfigServiceを再読み込みして、新しいAPI Keyをメモリに反映
      configService.reload()

      return { success: true }
    } catch (error) {
      console.error(`Failed to set setting ${key}:`, error)
      throw error
    }
  })

  /**
   * 設定値を削除
   */
  ipcMain.handle('settings:delete', async (_event, key: string) => {
    try {
      keychainService.deleteApiKey(key)

      // ConfigServiceを再読み込み
      configService.reload()

      return { success: true }
    } catch (error) {
      console.error(`Failed to delete setting ${key}:`, error)
      throw new Error(`設定の削除に失敗しました: ${key}`)
    }
  })

  /**
   * 暗号化が利用可能かチェック
   */
  ipcMain.handle('settings:isEncryptionAvailable', async () => {
    return keychainService.isEncryptionAvailable()
  })

  /**
   * すべてのAPI Keyを削除（リセット用）
   */
  ipcMain.handle('settings:clearAll', async () => {
    try {
      keychainService.clearAllApiKeys()
      configService.reload()
      return { success: true }
    } catch (error) {
      console.error('Failed to clear all settings:', error)
      throw new Error('すべての設定のクリアに失敗しました')
    }
  })
}
