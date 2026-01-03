import { dialog } from 'electron'
import fs from 'fs'
import path from 'path'
import { promisify } from 'util'

const stat = promisify(fs.stat)
const access = promisify(fs.access)

/**
 * FileService
 *
 * ファイル操作に関するサービス
 * - ファイル選択ダイアログ
 * - ファイル検証
 * - メタデータ取得
 */
export class FileService {
  private readonly SUPPORTED_FORMATS = ['.mp3', '.wav', '.m4a', '.mp4', '.mpeg', '.mpga', '.webm']
  private readonly MAX_FILE_SIZE = 2 * 1024 * 1024 * 1024 // 2GB

  /**
   * ファイル選択ダイアログを表示
   */
  async selectAudioFile(): Promise<string | null> {
    const result = await dialog.showOpenDialog({
      properties: ['openFile'],
      filters: [
        {
          name: 'Audio Files',
          extensions: ['mp3', 'wav', 'm4a', 'mp4', 'mpeg', 'mpga', 'webm'],
        },
        { name: 'All Files', extensions: ['*'] },
      ],
      title: 'Select Audio File',
    })

    if (result.canceled || result.filePaths.length === 0) {
      return null
    }

    return result.filePaths[0]
  }

  /**
   * ファイルを検証
   */
  async validateAudioFile(filePath: string): Promise<{ valid: boolean; error?: string }> {
    try {
      // ファイルの存在確認
      try {
        await access(filePath, fs.constants.R_OK)
      } catch {
        return { valid: false, error: 'File does not exist or is not readable' }
      }

      // ファイルサイズチェック
      const stats = await stat(filePath)
      if (stats.size === 0) {
        return { valid: false, error: 'File is empty' }
      }

      if (stats.size > this.MAX_FILE_SIZE) {
        return {
          valid: false,
          error: `File size exceeds maximum allowed size (${this.MAX_FILE_SIZE / (1024 * 1024 * 1024)}GB)`,
        }
      }

      // ファイル形式チェック
      const ext = path.extname(filePath).toLowerCase()
      if (!this.SUPPORTED_FORMATS.includes(ext)) {
        return {
          valid: false,
          error: `Unsupported file format. Supported formats: ${this.SUPPORTED_FORMATS.join(', ')}`,
        }
      }

      return { valid: true }
    } catch (error) {
      return {
        valid: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      }
    }
  }

  /**
   * ファイル情報を取得
   */
  async getFileInfo(filePath: string): Promise<{
    name: string
    path: string
    size: number
    extension: string
  }> {
    const stats = await stat(filePath)
    const ext = path.extname(filePath)

    return {
      name: path.basename(filePath),
      path: filePath,
      size: stats.size,
      extension: ext.slice(1), // Remove leading dot
    }
  }
}

// シングルトンインスタンスをエクスポート
export const fileService = new FileService()
