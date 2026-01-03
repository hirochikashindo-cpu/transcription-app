import { ipcMain } from 'electron'
import { fileService } from '../services/file/file-service'

/**
 * ファイル操作のIPCハンドラー
 */
export function registerFileHandlers(): void {
  /**
   * ファイル選択ダイアログを表示
   */
  ipcMain.handle('file:select', async (): Promise<string | null> => {
    return await fileService.selectAudioFile()
  })

  /**
   * ファイルを検証
   */
  ipcMain.handle(
    'file:validate',
    async (_event, filePath: string): Promise<{ valid: boolean; error?: string }> => {
      return await fileService.validateAudioFile(filePath)
    },
  )
}
