import { ipcMain, BrowserWindow } from 'electron'
import { whisperLocalService } from '../services/whisper/whisper-local-service'
import { databaseService } from '../services/database/database-service'
import type { Transcription, Segment, TranscriptionProgress } from '@shared/types/electron'

/**
 * 文字起こし処理のIPCハンドラー
 * WhisperLocalService (whisper.cpp) を使用したローカル実行
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

      if (!databaseService.projects || !databaseService.transcriptions || !databaseService.segments) {
        throw new Error('Database not initialized')
      }

      try {
        // プロジェクトのステータスを「処理中」に更新
        databaseService.projects.update(projectId, { status: 'processing' })

        // 進捗通知コールバック
        const onProgress = (progress: number, message?: string) => {
          const progressData: TranscriptionProgress = {
            projectId,
            status: 'processing',
            progress,
            error: undefined,
          }
          window.webContents.send('transcription:progress', progressData)
          console.log(`Progress: ${progress.toFixed(1)}% - ${message}`)
        }

        // 文字起こし実行（ローカル）
        const result = await whisperLocalService.transcribe(filePath, 'ja', onProgress)

        // 文字起こし結果をデータベースに保存
        const transcription = databaseService.transcriptions.create({
          project_id: projectId,
          content: result.text,
          language: result.language,
        })

        // セグメントを一括保存
        const segmentData = result.segments.map((seg) => ({
          transcription_id: transcription.id,
          start_time: seg.start_time,
          end_time: seg.end_time,
          text: seg.text,
          confidence: seg.confidence,
          sequence_number: seg.sequence_number,
        }))

        databaseService.segments.createBatch(segmentData)

        // プロジェクトのステータスを「完了」に更新し、音声の長さを保存
        // Note: UpdateProjectDataにaudio_durationがないため、直接SQLで更新
        const db = databaseService.getDatabase()
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
        try {
          databaseService.projects.update(projectId, { status: 'failed' })
        } catch (updateError) {
          console.error('Failed to update project status:', updateError)
        }

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
      if (!databaseService.transcriptions || !databaseService.segments) {
        throw new Error('Database not initialized')
      }

      // 文字起こしデータを取得
      const transcription = databaseService.transcriptions.findByProjectId(projectId)

      if (!transcription) {
        throw new Error(`Transcription not found for project: ${projectId}`)
      }

      // セグメントデータを取得
      const segments = databaseService.segments.findByTranscriptionId(transcription.id)

      return {
        ...transcription,
        segments,
      }
    }
  )

  /**
   * セグメントのテキストを更新
   */
  ipcMain.handle(
    'transcription:updateSegment',
    async (_event, segmentId: string, text: string): Promise<Segment> => {
      if (!databaseService.segments || !databaseService.transcriptions) {
        throw new Error('Database not initialized')
      }

      // セグメントを更新
      const segment = databaseService.segments.update(segmentId, { text })

      // 文字起こし全体のcontentも更新
      const allSegments = databaseService.segments.findByTranscriptionId(segment.transcription_id)
      const fullText = allSegments.map((s) => s.text).join(' ')

      databaseService.transcriptions.update(segment.transcription_id, {
        content: fullText,
      })

      return segment
    }
  )
}
