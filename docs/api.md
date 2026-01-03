# IPC API仕様書 (Inter-Process Communication API)

## 概要

このドキュメントでは、Renderer Process (React) と Main Process (Electron) 間のIPC通信APIについて詳細に説明します。

**通信方式**: `ipcRenderer.invoke()` / `ipcMain.handle()`
**セキュリティ**: Context Isolation有効、Preloadスクリプト経由でのみアクセス可能

---

## API一覧

| カテゴリ | API名 | 説明 |
|----------|-------|------|
| **Project** | `project:create` | プロジェクト作成 |
| | `project:findAll` | プロジェクト一覧取得 |
| | `project:findById` | プロジェクト詳細取得 |
| | `project:update` | プロジェクト更新 |
| | `project:delete` | プロジェクト削除 |
| **Transcription** | `transcription:start` | 文字起こし開始 |
| | `transcription:findByProject` | 文字起こし取得 |
| | `transcription:update` | 文字起こし更新 |
| **Segment** | `segment:findByTranscription` | セグメント一覧取得 |
| | `segment:update` | セグメント更新 |
| **Export** | `export:json` | JSON形式エクスポート |
| | `export:markdown` | Markdown形式エクスポート |
| **Settings** | `settings:get` | 設定値取得 |
| | `settings:set` | 設定値保存 |
| | `settings:delete` | 設定値削除 |
| **File** | `file:select` | ファイル選択ダイアログ |
| | `file:validate` | ファイルバリデーション |

---

## Project APIs

### `project:create`

新しいプロジェクトを作成します。

**リクエスト**:
```typescript
interface CreateProjectRequest {
  title: string                    // プロジェクト名 (1-100文字)
  description?: string             // 説明 (最大500文字)
  audio_file_path: string          // 音声ファイルの絶対パス
  audio_file_name: string          // 音声ファイル名
  audio_file_size?: number         // ファイルサイズ (bytes)
  audio_duration?: number          // 音声の長さ (秒)
  audio_format?: string            // ファイル形式 (mp3, wav等)
}
```

**レスポンス**:
```typescript
interface Project {
  id: string                       // UUID v4
  title: string
  description: string | null
  created_at: Date
  updated_at: Date
  status: 'pending' | 'processing' | 'completed' | 'failed'
  audio_file_path: string
  audio_file_name: string
  audio_file_size: number | null
  audio_duration: number | null
  audio_format: string | null
}
```

**エラー**:
- `INVALID_TITLE`: タイトルが空または100文字超過
- `INVALID_FILE_PATH`: ファイルパスが無効
- `FILE_NOT_FOUND`: 指定されたファイルが存在しない
- `DATABASE_ERROR`: データベース操作エラー

**使用例**:
```typescript
const project = await window.electronAPI.project.create({
  title: '2026年1月定例会議',
  description: '月次定例会議の議事録',
  audio_file_path: '/Users/user/Documents/meeting.mp3',
  audio_file_name: 'meeting.mp3',
  audio_file_size: 15728640,
  audio_duration: 3600.5,
  audio_format: 'mp3'
})
```

---

### `project:findAll`

プロジェクト一覧を取得します。フィルタリングと検索が可能。

**リクエスト**:
```typescript
interface ProjectFilter {
  status?: 'pending' | 'processing' | 'completed' | 'failed'  // ステータスフィルター
  search?: string                                             // タイトル・説明での検索
  limit?: number                                              // 取得件数制限 (デフォルト: 100)
  offset?: number                                             // スキップ件数 (ページネーション用)
}
```

**レスポンス**:
```typescript
Project[]  // Projectオブジェクトの配列 (created_at降順)
```

**エラー**:
- `DATABASE_ERROR`: データベース操作エラー

**使用例**:
```typescript
// すべてのプロジェクトを取得
const allProjects = await window.electronAPI.project.findAll()

// 完了したプロジェクトのみ取得
const completedProjects = await window.electronAPI.project.findAll({
  status: 'completed'
})

// タイトルで検索
const searchResults = await window.electronAPI.project.findAll({
  search: '会議'
})
```

---

### `project:findById`

プロジェクトの詳細情報を取得します。

**リクエスト**:
```typescript
string  // Project ID (UUID)
```

**レスポンス**:
```typescript
Project  // Projectオブジェクト
```

**エラー**:
- `PROJECT_NOT_FOUND`: 指定されたIDのプロジェクトが存在しない
- `DATABASE_ERROR`: データベース操作エラー

**使用例**:
```typescript
const project = await window.electronAPI.project.findById(
  '550e8400-e29b-41d4-a716-446655440000'
)
```

---

### `project:update`

プロジェクト情報を更新します。

**リクエスト**:
```typescript
interface UpdateProjectRequest {
  id: string                       // Project ID
  title?: string                   // 新しいタイトル
  description?: string             // 新しい説明
  status?: 'pending' | 'processing' | 'completed' | 'failed'  // 新しいステータス
}
```

**レスポンス**:
```typescript
Project  // 更新後のProjectオブジェクト
```

**エラー**:
- `PROJECT_NOT_FOUND`: 指定されたIDのプロジェクトが存在しない
- `INVALID_TITLE`: タイトルが空または100文字超過
- `DATABASE_ERROR`: データベース操作エラー

**使用例**:
```typescript
const updatedProject = await window.electronAPI.project.update({
  id: '550e8400-e29b-41d4-a716-446655440000',
  title: '2026年1月定例会議（修正版）',
  status: 'completed'
})
```

---

### `project:delete`

プロジェクトを削除します。関連する文字起こしとセグメントもカスケード削除されます。

**リクエスト**:
```typescript
string  // Project ID (UUID)
```

**レスポンス**:
```typescript
void
```

**エラー**:
- `PROJECT_NOT_FOUND`: 指定されたIDのプロジェクトが存在しない
- `DATABASE_ERROR`: データベース操作エラー

**使用例**:
```typescript
await window.electronAPI.project.delete('550e8400-e29b-41d4-a716-446655440000')
```

---

## Transcription APIs

### `transcription:start`

文字起こし処理を開始します。バックグラウンドで実行され、進捗は`transcription:progress`イベントで通知されます。

**リクエスト**:
```typescript
interface StartTranscriptionRequest {
  project_id: string               // Project ID
  language?: string                // 言語コード (デフォルト: 'ja')
}
```

**レスポンス**:
```typescript
interface StartTranscriptionResponse {
  transcription_id: string         // 作成された文字起こしのID
  status: 'started'
}
```

**エラー**:
- `PROJECT_NOT_FOUND`: 指定されたIDのプロジェクトが存在しない
- `AUDIO_FILE_NOT_FOUND`: 音声ファイルが見つからない
- `WHISPER_API_ERROR`: Whisper APIエラー
- `FFMPEG_NOT_FOUND`: FFmpegが見つからない

**使用例**:
```typescript
const result = await window.electronAPI.transcription.start({
  project_id: '550e8400-e29b-41d4-a716-446655440000',
  language: 'ja'
})

// 進捗イベントをリッスン
window.electronAPI.transcription.onProgress((progress) => {
  console.log(`Progress: ${progress.percent}%`)
})
```

---

### `transcription:findByProject`

プロジェクトの文字起こし結果を取得します。

**リクエスト**:
```typescript
string  // Project ID (UUID)
```

**レスポンス**:
```typescript
interface Transcription {
  id: string                       // UUID v4
  project_id: string
  content: string                  // 文字起こし全文
  language: string
  created_at: Date
  updated_at: Date
} | null  // 文字起こしが存在しない場合はnull
```

**エラー**:
- `DATABASE_ERROR`: データベース操作エラー

**使用例**:
```typescript
const transcription = await window.electronAPI.transcription.findByProject(
  '550e8400-e29b-41d4-a716-446655440000'
)
```

---

### `transcription:update`

文字起こし全文を更新します。

**リクエスト**:
```typescript
interface UpdateTranscriptionRequest {
  id: string                       // Transcription ID
  content: string                  // 新しい文字起こし全文
}
```

**レスポンス**:
```typescript
Transcription  // 更新後のTranscriptionオブジェクト
```

**エラー**:
- `TRANSCRIPTION_NOT_FOUND`: 指定されたIDの文字起こしが存在しない
- `DATABASE_ERROR`: データベース操作エラー

---

## Segment APIs

### `segment:findByTranscription`

文字起こしのセグメント一覧を取得します（sequence_number順）。

**リクエスト**:
```typescript
string  // Transcription ID (UUID)
```

**レスポンス**:
```typescript
interface Segment {
  id: string                       // UUID v4
  transcription_id: string
  start_time: number               // 開始時刻 (秒)
  end_time: number                 // 終了時刻 (秒)
  text: string                     // セグメントテキスト
  speaker_id: string | null        // 話者ID (Phase 2)
  confidence: number | null        // 信頼度スコア (0.0-1.0)
  sequence_number: number          // セグメント順序番号
}[]
```

**エラー**:
- `DATABASE_ERROR`: データベース操作エラー

**使用例**:
```typescript
const segments = await window.electronAPI.segment.findByTranscription(
  '660e8400-e29b-41d4-a716-446655440001'
)
```

---

### `segment:update`

セグメントのテキストを更新します。

**リクエスト**:
```typescript
interface UpdateSegmentRequest {
  id: string                       // Segment ID
  text: string                     // 新しいテキスト
}
```

**レスポンス**:
```typescript
Segment  // 更新後のSegmentオブジェクト
```

**エラー**:
- `SEGMENT_NOT_FOUND`: 指定されたIDのセグメントが存在しない
- `DATABASE_ERROR`: データベース操作エラー

**使用例**:
```typescript
const updatedSegment = await window.electronAPI.segment.update({
  id: '770e8400-e29b-41d4-a716-446655440002',
  text: 'おはようございます。（修正）'
})
```

---

## Export APIs

### `export:json`

文字起こし結果をJSON形式でエクスポートします。

**リクエスト**:
```typescript
interface ExportJsonRequest {
  project_id: string               // Project ID
  save_path?: string               // 保存先パス (省略時はダイアログ表示)
}
```

**レスポンス**:
```typescript
interface ExportResponse {
  success: boolean
  file_path: string                // 保存されたファイルのパス
}
```

**エラー**:
- `PROJECT_NOT_FOUND`: プロジェクトが存在しない
- `TRANSCRIPTION_NOT_FOUND`: 文字起こしが存在しない
- `EXPORT_CANCELLED`: ユーザーがエクスポートをキャンセル
- `FILE_WRITE_ERROR`: ファイル書き込みエラー

**エクスポート形式**:
```json
{
  "projectId": "550e8400-e29b-41d4-a716-446655440000",
  "title": "2026年1月定例会議",
  "audioFile": "meeting.mp3",
  "duration": 3600.5,
  "language": "ja",
  "transcription": {
    "content": "おはようございます。本日の会議を始めます...",
    "segments": [
      {
        "id": "770e8400-e29b-41d4-a716-446655440002",
        "startTime": 0.0,
        "endTime": 5.2,
        "text": "おはようございます。",
        "confidence": 0.95
      }
    ]
  },
  "metadata": {
    "createdAt": "2026-01-03T10:00:00Z",
    "exportedAt": "2026-01-03T11:00:00Z",
    "version": "1.0"
  }
}
```

---

### `export:markdown`

文字起こし結果をMarkdown形式でエクスポートします。

**リクエスト**:
```typescript
interface ExportMarkdownRequest {
  project_id: string               // Project ID
  save_path?: string               // 保存先パス (省略時はダイアログ表示)
  include_timestamps?: boolean     // タイムスタンプを含めるか (デフォルト: true)
}
```

**レスポンス**:
```typescript
ExportResponse  // export:jsonと同じ
```

**エクスポート形式**:
```markdown
# 2026年1月定例会議

## 基本情報
- 音声ファイル: meeting.mp3
- 長さ: 01:00:00
- 作成日: 2026-01-03
- 言語: 日本語

## 文字起こし

[00:00:00] おはようございます。
[00:00:05] 本日の会議を始めます。
[00:00:10] まず、前回の議事録を確認します...
```

---

## Settings APIs

### `settings:get`

設定値を取得します。暗号化されている値は自動的に復号化されます。

**リクエスト**:
```typescript
string  // 設定キー (例: 'OPENAI_API_KEY')
```

**レスポンス**:
```typescript
string | null  // 設定値 (存在しない場合はnull)
```

**エラー**:
- `DECRYPTION_ERROR`: 復号化エラー

**使用例**:
```typescript
const apiKey = await window.electronAPI.settings.get('OPENAI_API_KEY')
```

---

### `settings:set`

設定値を保存します。API Keyは自動的に暗号化されます。

**リクエスト**:
```typescript
interface SetSettingRequest {
  key: string                      // 設定キー
  value: string                    // 設定値
}
```

**レスポンス**:
```typescript
void
```

**エラー**:
- `ENCRYPTION_ERROR`: 暗号化エラー
- `DATABASE_ERROR`: データベース操作エラー

**使用例**:
```typescript
await window.electronAPI.settings.set('OPENAI_API_KEY', 'sk-...')
```

---

### `settings:delete`

設定値を削除します。

**リクエスト**:
```typescript
string  // 設定キー
```

**レスポンス**:
```typescript
void
```

---

## File APIs

### `file:select`

ファイル選択ダイアログを表示します。

**リクエスト**:
```typescript
interface FileSelectOptions {
  filters?: { name: string; extensions: string[] }[]  // ファイルフィルター
  multiSelect?: boolean                               // 複数選択可能か
}
```

**レスポンス**:
```typescript
interface FileSelectResponse {
  canceled: boolean
  filePaths: string[]              // 選択されたファイルパスの配列
}
```

**使用例**:
```typescript
const result = await window.electronAPI.file.select({
  filters: [
    { name: 'Audio Files', extensions: ['mp3', 'wav', 'm4a', 'aac'] }
  ],
  multiSelect: false
})

if (!result.canceled && result.filePaths.length > 0) {
  const filePath = result.filePaths[0]
  // ...
}
```

---

### `file:validate`

音声ファイルをバリデーションします。

**リクエスト**:
```typescript
interface FileValidateRequest {
  file_path: string                // ファイルパス
}
```

**レスポンス**:
```typescript
interface FileValidationResult {
  valid: boolean
  error?: string                   // エラーメッセージ
  metadata?: {
    size: number                   // ファイルサイズ (bytes)
    duration: number               // 音声の長さ (秒)
    format: string                 // ファイル形式
  }
}
```

**エラーケース**:
- ファイルが存在しない
- ファイル形式が対応していない
- ファイルが破損している

---

## イベント (Event Emitter)

### `transcription:progress`

文字起こしの進捗状況を通知します。

**ペイロード**:
```typescript
interface TranscriptionProgress {
  project_id: string
  percent: number                  // 進捗率 (0-100)
  status: 'processing' | 'completed' | 'failed'
  message?: string                 // ステータスメッセージ
}
```

**リスナー登録**:
```typescript
window.electronAPI.transcription.onProgress((progress) => {
  console.log(`Progress: ${progress.percent}%`)
})
```

---

## Preload Script型定義

すべてのAPIは `window.electronAPI` 経由でアクセスします。

```typescript
// electron/preload.ts
declare global {
  interface Window {
    electronAPI: {
      project: {
        create: (data: CreateProjectRequest) => Promise<Project>
        findAll: (filter?: ProjectFilter) => Promise<Project[]>
        findById: (id: string) => Promise<Project>
        update: (data: UpdateProjectRequest) => Promise<Project>
        delete: (id: string) => Promise<void>
      }
      transcription: {
        start: (data: StartTranscriptionRequest) => Promise<StartTranscriptionResponse>
        findByProject: (projectId: string) => Promise<Transcription | null>
        update: (data: UpdateTranscriptionRequest) => Promise<Transcription>
        onProgress: (callback: (progress: TranscriptionProgress) => void) => void
      }
      segment: {
        findByTranscription: (transcriptionId: string) => Promise<Segment[]>
        update: (data: UpdateSegmentRequest) => Promise<Segment>
      }
      export: {
        json: (data: ExportJsonRequest) => Promise<ExportResponse>
        markdown: (data: ExportMarkdownRequest) => Promise<ExportResponse>
      }
      settings: {
        get: (key: string) => Promise<string | null>
        set: (key: string, value: string) => Promise<void>
        delete: (key: string) => Promise<void>
      }
      file: {
        select: (options?: FileSelectOptions) => Promise<FileSelectResponse>
        validate: (data: FileValidateRequest) => Promise<FileValidationResult>
      }
    }
  }
}
```

---

## エラーハンドリング

すべてのAPIはエラー時に例外をスローします。

```typescript
try {
  const project = await window.electronAPI.project.create(data)
} catch (error) {
  if (error.code === 'INVALID_TITLE') {
    // タイトルが無効
  } else if (error.code === 'DATABASE_ERROR') {
    // データベースエラー
  } else {
    // その他のエラー
  }
}
```

---

## 参考資料

- [ER.md](./ER.md): データベーススキーマ
- [screen.md](./screen.md): 画面設計
- [Electron IPC Documentation](https://www.electronjs.org/docs/latest/tutorial/ipc)

---

**最終更新**: 2026-01-03
**バージョン**: 1.0 (Phase 1)
