import { ipcMain } from 'electron'
import { exportService } from '../services/export/export-service'

/**
 * エクスポート機能のIPCハンドラー
 */
export function registerExportHandlers(): void {
  /**
   * JSON形式でエクスポート
   */
  ipcMain.handle('export:json', async (_event, projectId: string): Promise<void> => {
    await exportService.exportToJson(projectId)
  })

  /**
   * Markdown形式でエクスポート
   */
  ipcMain.handle('export:markdown', async (_event, projectId: string): Promise<void> => {
    await exportService.exportToMarkdown(projectId)
  })
}
