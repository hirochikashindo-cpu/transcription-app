import { ipcMain } from 'electron'
import { ProjectRepository } from '../services/database/repositories/project-repository'
import { databaseService } from '../services/database/database-service'
import type {
  CreateProjectData,
  UpdateProjectData,
  ProjectFilter,
} from '@shared/types/electron'

let projectRepository: ProjectRepository

/**
 * Project関連のIPC Handlerを登録
 */
export function registerProjectHandlers(): void {
  const db = databaseService.getDatabase()
  projectRepository = new ProjectRepository(db)

  /**
   * プロジェクトを作成
   */
  ipcMain.handle('project:create', async (_event, data: CreateProjectData) => {
    try {
      return projectRepository.create(data)
    } catch (error) {
      console.error('Failed to create project:', error)
      throw new Error(
        `プロジェクトの作成に失敗しました: ${error instanceof Error ? error.message : String(error)}`
      )
    }
  })

  /**
   * すべてのプロジェクトを取得（フィルター可能）
   */
  ipcMain.handle('project:findAll', async (_event, filter?: ProjectFilter) => {
    try {
      return projectRepository.findAll(filter)
    } catch (error) {
      console.error('Failed to find projects:', error)
      throw new Error(
        `プロジェクトの取得に失敗しました: ${error instanceof Error ? error.message : String(error)}`
      )
    }
  })

  /**
   * IDでプロジェクトを取得
   */
  ipcMain.handle('project:findById', async (_event, id: string) => {
    try {
      const project = projectRepository.findById(id)
      if (!project) {
        throw new Error(`プロジェクトが見つかりません: ${id}`)
      }
      return project
    } catch (error) {
      console.error('Failed to find project:', error)
      throw error
    }
  })

  /**
   * プロジェクトを更新
   */
  ipcMain.handle('project:update', async (_event, id: string, updates: UpdateProjectData) => {
    try {
      return projectRepository.update(id, updates)
    } catch (error) {
      console.error('Failed to update project:', error)
      throw new Error(
        `プロジェクトの更新に失敗しました: ${error instanceof Error ? error.message : String(error)}`
      )
    }
  })

  /**
   * プロジェクトを削除
   */
  ipcMain.handle('project:delete', async (_event, id: string) => {
    try {
      projectRepository.delete(id)
    } catch (error) {
      console.error('Failed to delete project:', error)
      throw new Error(
        `プロジェクトの削除に失敗しました: ${error instanceof Error ? error.message : String(error)}`
      )
    }
  })

  /**
   * プロジェクト総数を取得
   */
  ipcMain.handle('project:count', async () => {
    try {
      return projectRepository.count()
    } catch (error) {
      console.error('Failed to count projects:', error)
      throw new Error(
        `プロジェクト数の取得に失敗しました: ${error instanceof Error ? error.message : String(error)}`
      )
    }
  })

  /**
   * ステータス別プロジェクト数を取得
   */
  ipcMain.handle('project:countByStatus', async () => {
    try {
      return projectRepository.countByStatus()
    } catch (error) {
      console.error('Failed to count projects by status:', error)
      throw new Error(
        `ステータス別プロジェクト数の取得に失敗しました: ${error instanceof Error ? error.message : String(error)}`
      )
    }
  })
}
