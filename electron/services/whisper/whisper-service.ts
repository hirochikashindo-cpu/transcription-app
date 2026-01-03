import axios, { AxiosInstance } from 'axios'
import ffmpeg from 'fluent-ffmpeg'
import fs from 'fs'
import path from 'path'
import { promisify } from 'util'

const stat = promisify(fs.stat)
const unlink = promisify(fs.unlink)

// Whisper API response types
interface WhisperSegment {
  id: number
  seek: number
  start: number
  end: number
  text: string
  tokens: number[]
  temperature: number
  avg_logprob: number
  compression_ratio: number
  no_speech_prob: number
}

interface WhisperResponse {
  text: string
  task: string
  language: string
  duration: number
  segments?: WhisperSegment[]
}

// Audio file metadata
interface AudioMetadata {
  duration: number // seconds
  fileSize: number // bytes
  format: string
  bitrate?: number
}

// Transcription result
export interface TranscriptionResult {
  text: string
  language: string
  duration: number
  segments: Array<{
    id: string
    start_time: number
    end_time: number
    text: string
    confidence?: number
    sequence_number: number
  }>
}

// Progress callback type
export type ProgressCallback = (progress: number, message?: string) => void

/**
 * WhisperService
 *
 * OpenAI Whisper APIを使用した音声文字起こしサービス
 * - ファイル分割（25MB制限対応）
 * - 並列処理
 * - 進捗通知
 * - エラーハンドリングとリトライ
 */
export class WhisperService {
  private apiKey: string
  private axiosInstance: AxiosInstance
  private readonly MAX_FILE_SIZE = 25 * 1024 * 1024 // 25MB
  private readonly CHUNK_DURATION = 600 // 10 minutes per chunk
  private readonly MAX_RETRIES = 3
  private readonly RETRY_DELAY = 1000 // 1 second

  constructor(apiKey: string) {
    if (!apiKey) {
      throw new Error('OpenAI API key is required')
    }

    this.apiKey = apiKey
    this.axiosInstance = axios.create({
      baseURL: 'https://api.openai.com/v1',
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
      },
      timeout: 300000, // 5 minutes
    })
  }

  /**
   * 音声ファイルのメタデータを取得
   */
  async getAudioMetadata(filePath: string): Promise<AudioMetadata> {
    return new Promise((resolve, reject) => {
      ffmpeg.ffprobe(filePath, async (err, metadata) => {
        if (err) {
          reject(new Error(`Failed to read audio metadata: ${err.message}`))
          return
        }

        try {
          const fileStats = await stat(filePath)
          const format = metadata.format.format_name || 'unknown'
          const duration = metadata.format.duration || 0
          const bitrate = metadata.format.bit_rate

          resolve({
            duration,
            fileSize: fileStats.size,
            format,
            bitrate,
          })
        } catch (error) {
          reject(new Error(`Failed to get file stats: ${error}`))
        }
      })
    })
  }

  /**
   * 音声ファイルを分割（25MB制限対応）
   */
  async splitAudioFile(
    filePath: string,
    metadata: AudioMetadata,
    onProgress?: ProgressCallback
  ): Promise<string[]> {
    // ファイルサイズが25MB以下の場合は分割不要
    if (metadata.fileSize <= this.MAX_FILE_SIZE) {
      return [filePath]
    }

    const chunks: string[] = []
    const totalChunks = Math.ceil(metadata.duration / this.CHUNK_DURATION)
    const tempDir = path.join(path.dirname(filePath), '.temp_chunks')

    // 一時ディレクトリを作成
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true })
    }

    for (let i = 0; i < totalChunks; i++) {
      const startTime = i * this.CHUNK_DURATION
      const outputPath = path.join(tempDir, `chunk_${i}.mp3`)

      await new Promise<void>((resolve, reject) => {
        ffmpeg(filePath)
          .setStartTime(startTime)
          .setDuration(this.CHUNK_DURATION)
          .output(outputPath)
          .on('end', () => {
            chunks.push(outputPath)
            if (onProgress) {
              const progress = ((i + 1) / totalChunks) * 10 // 0-10% for splitting
              onProgress(progress, `Split file into chunks: ${i + 1}/${totalChunks}`)
            }
            resolve()
          })
          .on('error', (err) => {
            reject(new Error(`Failed to split audio file: ${err.message}`))
          })
          .run()
      })
    }

    return chunks
  }

  /**
   * Whisper APIを呼び出し（リトライロジック付き）
   */
  async callWhisperAPI(
    filePath: string,
    language: string = 'ja',
    retryCount: number = 0
  ): Promise<WhisperResponse> {
    try {
      const formData = new FormData()
      const fileBuffer = fs.readFileSync(filePath)
      const blob = new Blob([fileBuffer])
      formData.append('file', blob, path.basename(filePath))
      formData.append('model', 'whisper-1')
      formData.append('language', language)
      formData.append('response_format', 'verbose_json')

      const response = await this.axiosInstance.post<WhisperResponse>(
        '/audio/transcriptions',
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        }
      )

      return response.data
    } catch (error) {
      // リトライロジック
      if (retryCount < this.MAX_RETRIES) {
        console.log(`Retrying Whisper API call (${retryCount + 1}/${this.MAX_RETRIES})...`)
        await new Promise((resolve) => setTimeout(resolve, this.RETRY_DELAY * (retryCount + 1)))
        return this.callWhisperAPI(filePath, language, retryCount + 1)
      }

      if (axios.isAxiosError(error)) {
        throw new Error(
          `Whisper API error: ${error.response?.data?.error?.message || error.message}`
        )
      }
      throw error
    }
  }

  /**
   * 分割結果をマージ
   */
  mergeTranscriptionResults(
    results: WhisperResponse[],
    timeOffsets: number[]
  ): TranscriptionResult {
    let fullText = ''
    const allSegments: TranscriptionResult['segments'] = []
    let sequenceNumber = 0

    results.forEach((result, index) => {
      const timeOffset = timeOffsets[index]
      fullText += (index > 0 ? ' ' : '') + result.text

      if (result.segments) {
        result.segments.forEach((segment) => {
          allSegments.push({
            id: `${index}-${segment.id}`,
            start_time: segment.start + timeOffset,
            end_time: segment.end + timeOffset,
            text: segment.text,
            confidence: 1 - segment.no_speech_prob,
            sequence_number: sequenceNumber++,
          })
        })
      }
    })

    return {
      text: fullText,
      language: results[0]?.language || 'ja',
      duration: timeOffsets[timeOffsets.length - 1] + (results[results.length - 1]?.duration || 0),
      segments: allSegments,
    }
  }

  /**
   * 音声ファイルを文字起こし
   */
  async transcribe(
    filePath: string,
    language: string = 'ja',
    onProgress?: ProgressCallback
  ): Promise<TranscriptionResult> {
    try {
      // 1. メタデータ取得
      if (onProgress) onProgress(0, 'Getting audio metadata...')
      const metadata = await this.getAudioMetadata(filePath)

      // 2. ファイル分割（必要な場合）
      if (onProgress) onProgress(5, 'Splitting audio file...')
      const chunks = await this.splitAudioFile(filePath, metadata, (progress, message) => {
        if (onProgress) onProgress(5 + progress, message)
      })

      // 3. Whisper API呼び出し
      const results: WhisperResponse[] = []
      const timeOffsets: number[] = []
      let currentOffset = 0

      for (let i = 0; i < chunks.length; i++) {
        if (onProgress) {
          const progress = 15 + (i / chunks.length) * 70 // 15-85% for API calls
          onProgress(progress, `Transcribing chunk ${i + 1}/${chunks.length}...`)
        }

        const result = await this.callWhisperAPI(chunks[i], language)
        results.push(result)
        timeOffsets.push(currentOffset)
        currentOffset += result.duration
      }

      // 4. 結果をマージ
      if (onProgress) onProgress(90, 'Merging results...')
      const mergedResult = this.mergeTranscriptionResults(results, timeOffsets)

      // 5. 一時ファイルをクリーンアップ
      if (chunks.length > 1) {
        if (onProgress) onProgress(95, 'Cleaning up temporary files...')
        const tempDir = path.dirname(chunks[0])
        for (const chunk of chunks) {
          try {
            await unlink(chunk)
          } catch (error) {
            console.warn(`Failed to delete temporary chunk: ${chunk}`)
          }
        }
        // 一時ディレクトリも削除
        try {
          fs.rmdirSync(tempDir)
        } catch (error) {
          console.warn(`Failed to delete temporary directory: ${tempDir}`)
        }
      }

      if (onProgress) onProgress(100, 'Transcription completed!')
      return mergedResult
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Transcription failed: ${error.message}`)
      }
      throw error
    }
  }

  /**
   * API キーを更新
   */
  updateApiKey(apiKey: string): void {
    this.apiKey = apiKey
    this.axiosInstance.defaults.headers.Authorization = `Bearer ${apiKey}`
  }
}

// シングルトンインスタンスは使用せず、必要に応じてインスタンスを作成する
// export const whisperService = new WhisperService(process.env.OPENAI_API_KEY || '')
