import { dialog } from 'electron'
import fs from 'fs'
import { promisify } from 'util'
import { databaseService } from '../database/database-service'
import type { ProjectRow, TranscriptionRow, SegmentRow } from '@shared/types/database'

const writeFile = promisify(fs.writeFile)

/**
 * ExportService
 *
 * 文字起こし結果のエクスポート機能
 * - JSON形式
 * - Markdown形式
 */
export class ExportService {
  /**
   * JSON形式でエクスポート
   */
  async exportToJson(projectId: string): Promise<void> {
    const db = databaseService.getDatabase()

    // プロジェクト情報を取得
    const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(projectId) as
      | ProjectRow
      | undefined

    if (!project) {
      throw new Error(`Project not found: ${projectId}`)
    }

    // 文字起こしデータを取得
    const transcription = db
      .prepare('SELECT * FROM transcriptions WHERE project_id = ? ORDER BY created_at DESC LIMIT 1')
      .get(projectId) as TranscriptionRow | undefined

    if (!transcription) {
      throw new Error(`Transcription not found for project: ${projectId}`)
    }

    // セグメントデータを取得
    const segments = db
      .prepare('SELECT * FROM segments WHERE transcription_id = ? ORDER BY sequence_number ASC')
      .all(transcription.id) as SegmentRow[]

    // JSONデータを構築
    const exportData = {
      projectId: project.id,
      title: project.title,
      description: project.description,
      audioFile: project.audio_file_name,
      duration: project.audio_duration,
      transcription: {
        id: transcription.id,
        content: transcription.content,
        language: transcription.language,
        segments: segments.map((seg) => ({
          id: seg.id,
          startTime: seg.start_time,
          endTime: seg.end_time,
          text: seg.text,
          speakerId: seg.speaker_id,
          confidence: seg.confidence,
        })),
      },
      metadata: {
        createdAt: project.created_at,
        updatedAt: project.updated_at,
        exportedAt: new Date().toISOString(),
      },
    }

    // 保存ダイアログを表示
    const result = await dialog.showSaveDialog({
      title: 'Export to JSON',
      defaultPath: `${project.title}.json`,
      filters: [{ name: 'JSON Files', extensions: ['json'] }],
    })

    if (result.canceled || !result.filePath) {
      return
    }

    // ファイルに保存
    await writeFile(result.filePath, JSON.stringify(exportData, null, 2), 'utf-8')
  }

  /**
   * Markdown形式でエクスポート
   */
  async exportToMarkdown(projectId: string): Promise<void> {
    const db = databaseService.getDatabase()

    // プロジェクト情報を取得
    const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(projectId) as
      | ProjectRow
      | undefined

    if (!project) {
      throw new Error(`Project not found: ${projectId}`)
    }

    // 文字起こしデータを取得
    const transcription = db
      .prepare('SELECT * FROM transcriptions WHERE project_id = ? ORDER BY created_at DESC LIMIT 1')
      .get(projectId) as TranscriptionRow | undefined

    if (!transcription) {
      throw new Error(`Transcription not found for project: ${projectId}`)
    }

    // セグメントデータを取得
    const segments = db
      .prepare('SELECT * FROM segments WHERE transcription_id = ? ORDER BY sequence_number ASC')
      .all(transcription.id) as SegmentRow[]

    // Markdownを構築
    let markdown = `# ${project.title}\n\n`

    if (project.description) {
      markdown += `${project.description}\n\n`
    }

    markdown += `## 基本情報\n\n`
    markdown += `- **音声ファイル**: ${project.audio_file_name}\n`

    if (project.audio_duration) {
      const hours = Math.floor(project.audio_duration / 3600)
      const minutes = Math.floor((project.audio_duration % 3600) / 60)
      const seconds = Math.floor(project.audio_duration % 60)
      markdown += `- **長さ**: ${hours > 0 ? `${hours}時間` : ''}${minutes}分${seconds}秒\n`
    }

    markdown += `- **言語**: ${transcription.language}\n`
    markdown += `- **作成日**: ${new Date(project.created_at).toLocaleString('ja-JP')}\n\n`

    markdown += `## 文字起こし\n\n`

    // セグメントごとに出力
    for (const segment of segments) {
      const hours = Math.floor(segment.start_time / 3600)
      const minutes = Math.floor((segment.start_time % 3600) / 60)
      const seconds = Math.floor(segment.start_time % 60)

      const timestamp =
        hours > 0
          ? `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
          : `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`

      markdown += `**[${timestamp}]** ${segment.text}\n\n`
    }

    markdown += `---\n\n`
    markdown += `*Exported on ${new Date().toLocaleString('ja-JP')}*\n`

    // 保存ダイアログを表示
    const result = await dialog.showSaveDialog({
      title: 'Export to Markdown',
      defaultPath: `${project.title}.md`,
      filters: [{ name: 'Markdown Files', extensions: ['md'] }],
    })

    if (result.canceled || !result.filePath) {
      return
    }

    // ファイルに保存
    await writeFile(result.filePath, markdown, 'utf-8')
  }
}

// シングルトンインスタンスをエクスポート
export const exportService = new ExportService()
