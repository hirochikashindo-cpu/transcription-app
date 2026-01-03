import { ipcMain, BrowserWindow } from 'electron'
import { v4 as uuidv4 } from 'uuid'
import { WhisperService } from '../services/whisper/whisper-service'
import { databaseService } from '../services/database/database-service'
import type { Transcription, Segment, TranscriptionProgress } from '@shared/types/electron'
import type { TranscriptionRow, SegmentRow } from '@shared/types/database'

/**
 * 文字起こし処理のIPCハンドラー
 */
export function registerTranscriptionHandlers(): void {
  /**
   * 文字起こしを開始
   */
  ipcMain.handle(
    'transcription:start',
    async (event, filePath: string, projectId: string): Promise<void> => {
      const window = BrowserWindow.fromWebContents(event.sender)
      if (!window) {
        throw new Error('Window not found')
      }

      try {
        // プロジェクトのステータスを「処理中」に更新
        const db = databaseService.getDatabase()
        db.prepare(
          'UPDATE projects SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?'
        ).run('processing', projectId)

        // 設定からAPI Keyを取得
        const apiKeyRow = db
          .prepare('SELECT value FROM settings WHERE key = ?')
          .get('openai_api_key') as { value: string } | undefined

        if (!apiKeyRow || !apiKeyRow.value) {
          throw new Error('OpenAI API key not configured. Please set it in Settings.')
        }

        // WhisperServiceのインスタンスを作成
        const whisperService = new WhisperService(apiKeyRow.value)

        // 進捗通知コールバック
        const onProgress = (progress: number, _message?: string) => {
          const progressData: TranscriptionProgress = {
            projectId,
            status: 'processing',
            progress,
            error: undefined,
          }
          window.webContents.send('transcription:progress', progressData)
        }

        // 文字起こし実行
        const result = await whisperService.transcribe(filePath, 'ja', onProgress)

        // 文字起こし結果をデータベースに保存
        const transcriptionId = uuidv4()

        // transcriptionsテーブルに保存
        db.prepare(
          `INSERT INTO transcriptions (id, project_id, content, language, created_at, updated_at)
           VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`
        ).run(transcriptionId, projectId, result.text, result.language)

        // segmentsテーブルに保存
        const insertSegment = db.prepare(
          `INSERT INTO segments (id, transcription_id, start_time, end_time, text, confidence, sequence_number)
           VALUES (?, ?, ?, ?, ?, ?, ?)`
        )

        for (const segment of result.segments) {
          insertSegment.run(
            segment.id,
            transcriptionId,
            segment.start_time,
            segment.end_time,
            segment.text,
            segment.confidence || null,
            segment.sequence_number
          )
        }

        // プロジェクトのステータスを「完了」に更新し、音声の長さを保存
        db.prepare(
          'UPDATE projects SET status = ?, audio_duration = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?'
        ).run('completed', result.duration, projectId)

        // 完了通知
        const completedProgress: TranscriptionProgress = {
          projectId,
          status: 'completed',
          progress: 100,
        }
        window.webContents.send('transcription:progress', completedProgress)
      } catch (error) {
        // エラー通知
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'

        // プロジェクトのステータスを「失敗」に更新
        const db = databaseService.getDatabase()
        db.prepare(
          'UPDATE projects SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?'
        ).run('failed', projectId)

        const errorProgress: TranscriptionProgress = {
          projectId,
          status: 'failed',
          progress: 0,
          error: errorMessage,
        }
        window.webContents.send('transcription:progress', errorProgress)

        throw new Error(errorMessage)
      }
    }
  )

  /**
   * プロジェクトIDから文字起こしデータを取得
   */
  ipcMain.handle(
    'transcription:getByProjectId',
    async (_event, projectId: string): Promise<Transcription> => {
      const db = databaseService.getDatabase()

      // 文字起こしデータを取得
      const transcriptionRow = db
        .prepare(
          'SELECT * FROM transcriptions WHERE project_id = ? ORDER BY created_at DESC LIMIT 1'
        )
        .get(projectId) as TranscriptionRow | undefined

      if (!transcriptionRow) {
        throw new Error(`Transcription not found for project: ${projectId}`)
      }

      // セグメントデータを取得
      const segmentRows = db
        .prepare('SELECT * FROM segments WHERE transcription_id = ? ORDER BY sequence_number ASC')
        .all(transcriptionRow.id) as SegmentRow[]

      const segments: Segment[] = segmentRows.map((row) => ({
        id: row.id,
        transcription_id: row.transcription_id,
        start_time: row.start_time,
        end_time: row.end_time,
        text: row.text,
        speaker_id: row.speaker_id,
        confidence: row.confidence,
        sequence_number: row.sequence_number,
      }))

      const transcription: Transcription = {
        id: transcriptionRow.id,
        project_id: transcriptionRow.project_id,
        content: transcriptionRow.content,
        language: transcriptionRow.language,
        created_at: new Date(transcriptionRow.created_at),
        updated_at: new Date(transcriptionRow.updated_at),
        segments,
      }

      return transcription
    }
  )

  /**
   * セグメントのテキストを更新
   */
  ipcMain.handle(
    'transcription:updateSegment',
    async (_event, segmentId: string, text: string): Promise<Segment> => {
      const db = databaseService.getDatabase()

      // セグメントを更新
      db.prepare('UPDATE segments SET text = ? WHERE id = ?').run(text, segmentId)

      // 更新されたセグメントを取得
      const segmentRow = db.prepare('SELECT * FROM segments WHERE id = ?').get(segmentId) as
        | SegmentRow
        | undefined

      if (!segmentRow) {
        throw new Error(`Segment not found: ${segmentId}`)
      }

      // 文字起こし全体のcontentも更新
      const allSegments = db
        .prepare(
          'SELECT text FROM segments WHERE transcription_id = ? ORDER BY sequence_number ASC'
        )
        .all(segmentRow.transcription_id) as { text: string }[]

      const fullText = allSegments.map((s) => s.text).join(' ')

      db.prepare(
        'UPDATE transcriptions SET content = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?'
      ).run(fullText, segmentRow.transcription_id)

      const segment: Segment = {
        id: segmentRow.id,
        transcription_id: segmentRow.transcription_id,
        start_time: segmentRow.start_time,
        end_time: segmentRow.end_time,
        text: segmentRow.text,
        speaker_id: segmentRow.speaker_id,
        confidence: segmentRow.confidence,
        sequence_number: segmentRow.sequence_number,
      }

      return segment
    }
  )
}
