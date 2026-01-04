import { ipcMain } from 'electron'
import { databaseService } from '../services/database/database-service'
import { fileService } from '../services/file/file-service'
import type {
  Project,
  CreateProjectData,
  UpdateProjectData,
  ProjectFilter,
} from '@shared/types/electron'

/**
 * プロジェクト管理のIPCハンドラー
 * Repositoryパターンを使用してデータベースアクセスを抽象化
 */
export function registerProjectHandlers(): void {
  /**
   * プロジェクトを作成
   */
  ipcMain.handle('project:create', async (_event, data: CreateProjectData): Promise<Project> => {
    if (!databaseService.projects) {
      throw new Error('Database not initialized')
    }

    // ファイル情報を取得
    const fileInfo = await fileService.getFileInfo(data.audio_file_path)

    // Repositoryを使用してプロジェクトを作成
    const project = databaseService.projects.create({
      ...data,
      audio_file_name: fileInfo.name,
      audio_file_size: fileInfo.size,
      audio_format: fileInfo.extension,
    })

    return project
  })

  /**
   * プロジェクト一覧を取得
   */
  ipcMain.handle('project:findAll', async (_event, filter?: ProjectFilter): Promise<Project[]> => {
    if (!databaseService.projects) {
      throw new Error('Database not initialized')
    }

    return databaseService.projects.findAll(filter)
  })

  /**
   * プロジェクトをIDで取得
   */
  ipcMain.handle('project:findById', async (_event, id: string): Promise<Project> => {
    if (!databaseService.projects) {
      throw new Error('Database not initialized')
    }

    const project = databaseService.projects.findById(id)

    if (!project) {
      throw new Error(`Project not found: ${id}`)
    }

    return project
  })

  /**
   * プロジェクトを更新
   */
  ipcMain.handle(
    'project:update',
    async (_event, id: string, updates: UpdateProjectData): Promise<Project> => {
      if (!databaseService.projects) {
        throw new Error('Database not initialized')
      }

      return databaseService.projects.update(id, updates)
    }
  )

  /**
   * プロジェクトを削除
   */
  ipcMain.handle('project:delete', async (_event, id: string): Promise<void> => {
    if (!databaseService.projects) {
      throw new Error('Database not initialized')
    }

    databaseService.projects.delete(id)
  })
}
