import { ipcMain } from 'electron'
import { databaseService } from '../services/database/database-service'
import type { Speaker, CreateSpeakerData, UpdateSpeakerData } from '@shared/types/electron'

/**
 * 話者管理のIPCハンドラー
 * Repositoryパターンを使用してデータベースアクセスを抽象化
 */
export function registerSpeakerHandlers(): void {
  /**
   * 話者を作成
   */
  ipcMain.handle('speaker:create', async (_event, data: CreateSpeakerData): Promise<Speaker> => {
    if (!databaseService.speakers) {
      throw new Error('Database not initialized')
    }

    return databaseService.speakers.create(data)
  })

  /**
   * プロジェクトIDで話者を取得
   */
  ipcMain.handle('speaker:findByProjectId', async (_event, projectId: string): Promise<Speaker[]> => {
    if (!databaseService.speakers) {
      throw new Error('Database not initialized')
    }

    return databaseService.speakers.findByProjectId(projectId)
  })

  /**
   * 話者をIDで取得
   */
  ipcMain.handle('speaker:findById', async (_event, id: string): Promise<Speaker> => {
    if (!databaseService.speakers) {
      throw new Error('Database not initialized')
    }

    const speaker = databaseService.speakers.findById(id)

    if (!speaker) {
      throw new Error(`Speaker not found: ${id}`)
    }

    return speaker
  })

  /**
   * 話者を更新
   */
  ipcMain.handle(
    'speaker:update',
    async (_event, id: string, updates: UpdateSpeakerData): Promise<Speaker> => {
      if (!databaseService.speakers) {
        throw new Error('Database not initialized')
      }

      return databaseService.speakers.update(id, updates)
    }
  )

  /**
   * 話者を削除
   */
  ipcMain.handle('speaker:delete', async (_event, id: string): Promise<void> => {
    if (!databaseService.speakers) {
      throw new Error('Database not initialized')
    }

    databaseService.speakers.delete(id)
  })
}
