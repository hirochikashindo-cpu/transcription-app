import { spawn } from 'child_process'
import fs from 'fs'
import path from 'path'
import { modelDownloadService, WHISPER_MODELS } from './model-download-service'
import type { TranscriptionResult, ProgressCallback } from './whisper-service'

/**
 * WhisperLocalService
 *
 * whisper.cpp を使用したローカル音声文字起こしサービス
 * - APIコスト不要
 * - プライバシー保護（データが外部送信されない）
 * - オフライン動作可能
 */
export class WhisperLocalService {
  private readonly whisperBinPath: string
  private readonly defaultModel: string = 'turbo'

  constructor() {
    // whisper-cli のパス (Homebrewインストール)
    this.whisperBinPath = '/opt/homebrew/bin/whisper-cli'

    // whisper-cliが存在するか確認
    if (!fs.existsSync(this.whisperBinPath)) {
      throw new Error(
        `whisper-cli not found at ${this.whisperBinPath}. Please install whisper-cpp via Homebrew: brew install whisper-cpp`
      )
    }
  }

  /**
   * モデルの初期化（必要に応じてダウンロード）
   *
   * @param modelKey - モデルキー (デフォルト: 'turbo')
   * @param onProgress - ダウンロード進捗コールバック (オプション)
   */
  async ensureModelDownloaded(
    modelKey: string = this.defaultModel,
    onProgress?: (progress: number, message?: string) => void
  ): Promise<string> {
    if (!WHISPER_MODELS[modelKey]) {
      throw new Error(`Unknown model: ${modelKey}`)
    }

    // モデルが既にダウンロード済みかチェック
    if (modelDownloadService.isModelDownloaded(modelKey)) {
      console.log(`Model already available: ${modelKey}`)
      return modelDownloadService.getModelPath(modelKey)
    }

    // モデルをダウンロード
    console.log(`Downloading model: ${modelKey}`)
    if (onProgress) {
      onProgress(0, `Downloading ${WHISPER_MODELS[modelKey].name}...`)
    }

    const modelPath = await modelDownloadService.downloadModel(modelKey, (progress) => {
      if (onProgress) {
        onProgress(progress.percentage, `Downloading: ${progress.percentage.toFixed(1)}%`)
      }
    })

    if (onProgress) {
      onProgress(100, 'Model downloaded successfully')
    }

    return modelPath
  }

  /**
   * 音声ファイルを文字起こし
   *
   * @param filePath - 音声ファイルパス
   * @param language - 言語コード (デフォルト: 'ja')
   * @param onProgress - 進捗コールバック (オプション)
   * @returns 文字起こし結果
   */
  async transcribe(
    filePath: string,
    language: string = 'ja',
    onProgress?: ProgressCallback
  ): Promise<TranscriptionResult> {
    // ファイルの存在確認
    if (!fs.existsSync(filePath)) {
      throw new Error(`Audio file not found: ${filePath}`)
    }

    try {
      // モデルの準備
      if (onProgress) onProgress(0, 'Preparing model...')
      const modelPath = await this.ensureModelDownloaded(this.defaultModel, onProgress)

      // whisper-cliを実行
      if (onProgress) onProgress(10, 'Starting transcription...')
      const result = await this.runWhisperCLI(filePath, modelPath, language, onProgress)

      if (onProgress) onProgress(100, 'Transcription completed!')
      return result
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Transcription failed: ${error.message}`)
      }
      throw error
    }
  }

  /**
   * whisper-cliを実行
   *
   * @param audioPath - 音声ファイルパス
   * @param modelPath - モデルファイルパス
   * @param language - 言語コード
   * @param onProgress - 進捗コールバック
   * @returns 文字起こし結果
   */
  private async runWhisperCLI(
    audioPath: string,
    modelPath: string,
    language: string,
    onProgress?: ProgressCallback
  ): Promise<TranscriptionResult> {
    return new Promise((resolve, reject) => {
      // 出力ファイルのパス
      // whisper-cliは入力ファイル名に.txtを追加する（例: test.mp3 → test.mp3.txt）
      const outputDir = path.dirname(audioPath)
      const baseName = path.basename(audioPath)
      const txtOutputPath = path.join(outputDir, `${baseName}.txt`)

      // whisper-cli の引数
      const args = [
        '-m',
        modelPath, // モデルファイル
        '-f',
        audioPath, // 音声ファイル
        '-l',
        language, // 言語
        '-otxt', // テキストファイル出力
        '-t',
        '4', // スレッド数
        '-np', // 進捗表示なし
      ]

      console.log(`Running: ${this.whisperBinPath} ${args.join(' ')}`)

      const process = spawn(this.whisperBinPath, args)

      let stderr = ''
      let stdout = ''

      process.stdout.on('data', (data) => {
        stdout += data.toString()
        console.log(`whisper-cli stdout: ${data}`)

        // 進捗をパース（whisper-cliの出力から進捗を推定）
        if (onProgress) {
          // 簡易的な進捗表示（10%から90%の間で徐々に増加）
          const match = stdout.match(/\[(\d+):(\d+)\.\d+ --> (\d+):(\d+)\.\d+\]/)
          if (match) {
            // タイムスタンプから進捗を推定
            const currentTime = parseInt(match[3]) * 60 + parseInt(match[4])
            // 仮に最大1時間として計算（実際の長さは不明なので概算）
            const estimatedProgress = Math.min(90, 10 + (currentTime / 3600) * 80)
            onProgress(estimatedProgress, 'Transcribing...')
          }
        }
      })

      process.stderr.on('data', (data) => {
        stderr += data.toString()
        console.error(`whisper-cli stderr: ${data}`)
      })

      process.on('close', (code) => {
        if (code !== 0) {
          reject(new Error(`whisper-cli exited with code ${code}: ${stderr}`))
          return
        }

        try {
          // 出力ファイルを読み込み
          if (!fs.existsSync(txtOutputPath)) {
            reject(new Error(`Output file not found: ${txtOutputPath}`))
            return
          }

          const transcriptionText = fs.readFileSync(txtOutputPath, 'utf-8')

          // セグメント情報を解析（whisper-cliの標準出力から）
          const segments = this.parseSegments(stdout, transcriptionText)

          // 結果を返す
          const result: TranscriptionResult = {
            text: transcriptionText.trim(),
            language,
            duration: this.extractDuration(stdout),
            segments,
          }

          // 一時ファイルを削除
          if (fs.existsSync(txtOutputPath)) {
            fs.unlinkSync(txtOutputPath)
          }

          resolve(result)
        } catch (error) {
          reject(error)
        }
      })

      process.on('error', (error) => {
        reject(new Error(`Failed to spawn whisper-cli: ${error.message}`))
      })
    })
  }

  /**
   * whisper-cliの出力からセグメント情報を解析
   *
   * @param output - whisper-cliの標準出力
   * @param fullText - 全文テキスト
   * @returns セグメント配列
   */
  private parseSegments(
    output: string,
    _fullText: string
  ): TranscriptionResult['segments'] {
    const segments: TranscriptionResult['segments'] = []
    const lines = output.split('\n')

    let sequenceNumber = 0
    for (const line of lines) {
      // タイムスタンプとテキストをパース
      // 例: [00:00:00.000 --> 00:00:05.000]  こんにちは
      const match = line.match(/\[(\d+):(\d+):(\d+)\.(\d+) --> (\d+):(\d+):(\d+)\.(\d+)\]\s+(.+)/)
      if (match) {
        const startHours = parseInt(match[1])
        const startMinutes = parseInt(match[2])
        const startSeconds = parseInt(match[3])
        const startMillis = parseInt(match[4])

        const endHours = parseInt(match[5])
        const endMinutes = parseInt(match[6])
        const endSeconds = parseInt(match[7])
        const endMillis = parseInt(match[8])

        const text = match[9].trim()

        const startTime =
          startHours * 3600 + startMinutes * 60 + startSeconds + startMillis / 1000
        const endTime = endHours * 3600 + endMinutes * 60 + endSeconds + endMillis / 1000

        segments.push({
          id: `segment-${sequenceNumber}`,
          start_time: startTime,
          end_time: endTime,
          text,
          sequence_number: sequenceNumber,
          confidence: 0.9, // whisper-cliからは信頼度が取得できないため固定値
        })

        sequenceNumber++
      }
    }

    return segments
  }

  /**
   * whisper-cliの出力から音声の長さを抽出
   *
   * @param output - whisper-cliの標準出力
   * @returns 音声の長さ（秒）
   */
  private extractDuration(output: string): number {
    // whisper-cliの出力から音声の長さを推定
    const lines = output.split('\n')
    let maxEndTime = 0

    for (const line of lines) {
      const match = line.match(/(\d+):(\d+):(\d+)\.(\d+) --> (\d+):(\d+):(\d+)\.(\d+)/)
      if (match) {
        const endHours = parseInt(match[5])
        const endMinutes = parseInt(match[6])
        const endSeconds = parseInt(match[7])
        const endMillis = parseInt(match[8])

        const endTime = endHours * 3600 + endMinutes * 60 + endSeconds + endMillis / 1000
        maxEndTime = Math.max(maxEndTime, endTime)
      }
    }

    return maxEndTime
  }

  /**
   * 利用可能なモデル一覧を取得
   *
   * @returns モデル情報の配列
   */
  getAvailableModels() {
    return Object.entries(WHISPER_MODELS).map(([key, model]) => ({
      key,
      ...model,
      isDownloaded: modelDownloadService.isModelDownloaded(key),
    }))
  }
}

// シングルトンインスタンス
export const whisperLocalService = new WhisperLocalService()
