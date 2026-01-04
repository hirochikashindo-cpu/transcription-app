import { ipcMain, dialog } from 'electron'
import { databaseService } from '../services/database/database-service'
import fs from 'fs'
import type {
  DictionaryEntry,
  CreateDictionaryEntryData,
  UpdateDictionaryEntryData,
  DictionaryFilter,
} from '@shared/types/electron'

/**
 * 辞書管理のIPCハンドラー
 * Repositoryパターンを使用してデータベースアクセスを抽象化
 */
export function registerDictionaryHandlers(): void {
  /**
   * 辞書エントリを作成
   */
  ipcMain.handle(
    'dictionary:create',
    async (_event, data: CreateDictionaryEntryData): Promise<DictionaryEntry> => {
      if (!databaseService.dictionaries) {
        throw new Error('Database not initialized')
      }

      return databaseService.dictionaries.create(data)
    }
  )

  /**
   * 辞書エントリ一覧を取得
   */
  ipcMain.handle(
    'dictionary:findAll',
    async (_event, filter?: DictionaryFilter): Promise<DictionaryEntry[]> => {
      if (!databaseService.dictionaries) {
        throw new Error('Database not initialized')
      }

      return databaseService.dictionaries.findAll(filter)
    }
  )

  /**
   * 辞書エントリをIDで取得
   */
  ipcMain.handle('dictionary:findById', async (_event, id: string): Promise<DictionaryEntry> => {
    if (!databaseService.dictionaries) {
      throw new Error('Database not initialized')
    }

    const entry = databaseService.dictionaries.findById(id)

    if (!entry) {
      throw new Error(`Dictionary entry not found: ${id}`)
    }

    return entry
  })

  /**
   * 辞書エントリを更新
   */
  ipcMain.handle(
    'dictionary:update',
    async (_event, id: string, updates: UpdateDictionaryEntryData): Promise<DictionaryEntry> => {
      if (!databaseService.dictionaries) {
        throw new Error('Database not initialized')
      }

      return databaseService.dictionaries.update(id, updates)
    }
  )

  /**
   * 辞書エントリを削除
   */
  ipcMain.handle('dictionary:delete', async (_event, id: string): Promise<void> => {
    if (!databaseService.dictionaries) {
      throw new Error('Database not initialized')
    }

    databaseService.dictionaries.delete(id)
  })

  /**
   * 使用回数をインクリメント
   */
  ipcMain.handle('dictionary:incrementUsage', async (_event, id: string): Promise<DictionaryEntry> => {
    if (!databaseService.dictionaries) {
      throw new Error('Database not initialized')
    }

    return databaseService.dictionaries.incrementUsage(id)
  })

  /**
   * CSVファイルからインポート
   */
  ipcMain.handle(
    'dictionary:importFromCsv',
    async (): Promise<{ imported: number; errors: string[] }> => {
      if (!databaseService.dictionaries) {
        throw new Error('Database not initialized')
      }

      // ファイル選択ダイアログを表示
      const result = await dialog.showOpenDialog({
        properties: ['openFile'],
        filters: [{ name: 'CSV Files', extensions: ['csv'] }],
      })

      if (result.canceled || result.filePaths.length === 0) {
        return { imported: 0, errors: [] }
      }

      const filePath = result.filePaths[0]
      const csvContent = fs.readFileSync(filePath, 'utf-8')

      return parseCsvAndImport(csvContent)
    }
  )

  /**
   * CSVファイルへエクスポート
   */
  ipcMain.handle('dictionary:exportToCsv', async (): Promise<void> => {
    if (!databaseService.dictionaries) {
      throw new Error('Database not initialized')
    }

    // ファイル保存ダイアログを表示
    const result = await dialog.showSaveDialog({
      defaultPath: 'dictionary.csv',
      filters: [{ name: 'CSV Files', extensions: ['csv'] }],
    })

    if (result.canceled || !result.filePath) {
      return
    }

    const entries = databaseService.dictionaries.findAll()

    // CSV形式に変換
    const csvLines = ['word,reading,category,usage_count']
    for (const entry of entries) {
      const line = [
        escapeCsvField(entry.word),
        escapeCsvField(entry.reading || ''),
        escapeCsvField(entry.category || ''),
        entry.usage_count.toString(),
      ].join(',')
      csvLines.push(line)
    }

    const csvContent = csvLines.join('\n')
    fs.writeFileSync(result.filePath, csvContent, 'utf-8')
  })
}

/**
 * CSVの内容をパースしてインポート
 */
function parseCsvAndImport(csvContent: string): { imported: number; errors: string[] } {
  const lines = csvContent.split('\n').filter((line) => line.trim())
  const errors: string[] = []
  let imported = 0

  // ヘッダー行をスキップ
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i]
    const fields = parseCsvLine(line)

    if (fields.length < 1) {
      errors.push(`Line ${i + 1}: Invalid format`)
      continue
    }

    const word = fields[0].trim()
    if (!word) {
      errors.push(`Line ${i + 1}: Word is required`)
      continue
    }

    try {
      databaseService.dictionaries!.create({
        word,
        reading: fields[1]?.trim() || undefined,
        category: fields[2]?.trim() || undefined,
      })
      imported++
    } catch (error) {
      if (error instanceof Error) {
        errors.push(`Line ${i + 1}: ${error.message}`)
      } else {
        errors.push(`Line ${i + 1}: Unknown error`)
      }
    }
  }

  return { imported, errors }
}

/**
 * CSV行をパース（カンマ区切り、引用符対応）
 */
function parseCsvLine(line: string): string[] {
  const fields: string[] = []
  let currentField = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const char = line[i]
    const nextChar = line[i + 1]

    if (char === '"' && !inQuotes) {
      inQuotes = true
    } else if (char === '"' && inQuotes) {
      if (nextChar === '"') {
        // エスケープされた引用符
        currentField += '"'
        i++ // 次の引用符をスキップ
      } else {
        inQuotes = false
      }
    } else if (char === ',' && !inQuotes) {
      fields.push(currentField)
      currentField = ''
    } else {
      currentField += char
    }
  }

  fields.push(currentField)
  return fields
}

/**
 * CSVフィールドをエスケープ
 */
function escapeCsvField(field: string): string {
  if (field.includes(',') || field.includes('"') || field.includes('\n')) {
    return `"${field.replace(/"/g, '""')}"`
  }
  return field
}
