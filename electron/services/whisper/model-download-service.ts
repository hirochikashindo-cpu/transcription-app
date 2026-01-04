import axios from 'axios'
import fs from 'fs'
import path from 'path'
import { app } from 'electron'
import { promisify } from 'util'
import { pipeline } from 'stream'

const streamPipeline = promisify(pipeline)

/**
 * Whisper モデル情報
 */
export interface WhisperModel {
  name: string
  fileName: string
  url: string
  size: number // bytes
  description: string
}

/**
 * ダウンロード進捗情報
 */
export interface DownloadProgress {
  downloaded: number // bytes
  total: number // bytes
  percentage: number // 0-100
  speed?: number // bytes/sec
}

/**
 * 利用可能なWhisperモデル
 */
export const WHISPER_MODELS: Record<string, WhisperModel> = {
  'turbo': {
    name: 'Whisper Large v3 Turbo',
    fileName: 'ggml-large-v3-turbo.bin',
    url: 'https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-large-v3-turbo.bin',
    size: 809 * 1024 * 1024, // ~809MB
    description: 'Fastest and most accurate model (recommended)',
  },
  'base': {
    name: 'Whisper Base',
    fileName: 'ggml-base.bin',
    url: 'https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-base.bin',
    size: 142 * 1024 * 1024, // ~142MB
    description: 'Small model for testing',
  },
}

/**
 * ModelDownloadService
 *
 * Whisperモデルファイルのダウンロードと管理を担当
 */
export class ModelDownloadService {
  private readonly modelsDir: string

  constructor() {
    // モデル保存先ディレクトリ
    const userDataPath = app.getPath('userData')
    this.modelsDir = path.join(userDataPath, 'whisper-models')

    // ディレクトリが存在しない場合は作成
    if (!fs.existsSync(this.modelsDir)) {
      fs.mkdirSync(this.modelsDir, { recursive: true })
      console.log(`Created models directory: ${this.modelsDir}`)
    }
  }

  /**
   * モデルがダウンロード済みかチェック
   *
   * @param modelKey - モデルキー ('turbo', 'base' など)
   * @returns ダウンロード済みの場合true
   */
  isModelDownloaded(modelKey: string): boolean {
    const model = WHISPER_MODELS[modelKey]
    if (!model) {
      throw new Error(`Unknown model: ${modelKey}`)
    }

    const modelPath = this.getModelPath(modelKey)
    return fs.existsSync(modelPath)
  }

  /**
   * モデルファイルのパスを取得
   *
   * @param modelKey - モデルキー
   * @returns モデルファイルの絶対パス
   */
  getModelPath(modelKey: string): string {
    const model = WHISPER_MODELS[modelKey]
    if (!model) {
      throw new Error(`Unknown model: ${modelKey}`)
    }

    return path.join(this.modelsDir, model.fileName)
  }

  /**
   * モデルをダウンロード
   *
   * @param modelKey - モデルキー
   * @param onProgress - 進捗コールバック (オプション)
   * @returns ダウンロードされたモデルファイルのパス
   */
  async downloadModel(
    modelKey: string,
    onProgress?: (progress: DownloadProgress) => void
  ): Promise<string> {
    const model = WHISPER_MODELS[modelKey]
    if (!model) {
      throw new Error(`Unknown model: ${modelKey}`)
    }

    const modelPath = this.getModelPath(modelKey)

    // 既にダウンロード済みの場合はスキップ
    if (this.isModelDownloaded(modelKey)) {
      console.log(`Model already downloaded: ${modelPath}`)
      return modelPath
    }

    console.log(`Downloading model: ${model.name}`)
    console.log(`URL: ${model.url}`)
    console.log(`Size: ${(model.size / 1024 / 1024).toFixed(2)} MB`)

    try {
      const response = await axios({
        method: 'GET',
        url: model.url,
        responseType: 'stream',
        onDownloadProgress: (progressEvent) => {
          if (onProgress && progressEvent.total) {
            const downloaded = progressEvent.loaded
            const total = progressEvent.total
            const percentage = (downloaded / total) * 100

            onProgress({
              downloaded,
              total,
              percentage,
            })
          }
        },
      })

      // 一時ファイルに書き込み
      const tempPath = `${modelPath}.tmp`
      const writer = fs.createWriteStream(tempPath)

      await streamPipeline(response.data, writer)

      // ダウンロード完了後、一時ファイルをリネーム
      fs.renameSync(tempPath, modelPath)

      console.log(`Model downloaded successfully: ${modelPath}`)
      return modelPath
    } catch (error) {
      // エラー時は一時ファイルを削除
      const tempPath = `${modelPath}.tmp`
      if (fs.existsSync(tempPath)) {
        fs.unlinkSync(tempPath)
      }

      if (axios.isAxiosError(error)) {
        throw new Error(`Failed to download model: ${error.message}`)
      }
      throw error
    }
  }

  /**
   * モデルを削除
   *
   * @param modelKey - モデルキー
   */
  deleteModel(modelKey: string): void {
    const modelPath = this.getModelPath(modelKey)

    if (!fs.existsSync(modelPath)) {
      console.log(`Model not found, nothing to delete: ${modelPath}`)
      return
    }

    fs.unlinkSync(modelPath)
    console.log(`Model deleted: ${modelPath}`)
  }

  /**
   * ダウンロード済みモデルの一覧を取得
   *
   * @returns ダウンロード済みモデルのキー配列
   */
  getDownloadedModels(): string[] {
    return Object.keys(WHISPER_MODELS).filter((key) => this.isModelDownloaded(key))
  }

  /**
   * モデルディレクトリのパスを取得
   *
   * @returns モデルディレクトリの絶対パス
   */
  getModelsDirectory(): string {
    return this.modelsDir
  }
}

// シングルトンインスタンス
export const modelDownloadService = new ModelDownloadService()
