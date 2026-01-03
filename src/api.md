# API仕様書

## 概要

Transcription AppのAPI仕様を定義します。

- **IPC API**: Electron Renderer Process ⇄ Main Process間の通信
- **外部API**: OpenAI Whisper API、Anthropic Claude API

---

## 目次

1. [IPC API](#ipc-api)
2. [外部API](#外部api)
3. [データ型定義](#データ型定義)
4. [エラーハンドリング](#エラーハンドリング)

---

## IPC API

### 概要

ElectronのIPC（Inter-Process Communication）を使用してRenderer ProcessとMain Process間でデータをやり取りします。

**通信方式**:
- `ipcRenderer.invoke()` → `ipcMain.handle()` (双方向通信、Promise返却)
- `ipcMain.send()` → `ipcRenderer.on()` (イベント通知、一方向)

---

## 1. Project API

### 1.1 プロジェクト作成

**メソッド**: `project:create`

**説明**: 新規プロジェクトを作成

**リクエスト**:
```typescript
interface CreateProjectRequest {
  title: string;
  description?: string;
  audioFilePath: string;
  audioFileName: string;
  audioFileSize: number;
  audioDuration?: number;
  audioFormat: string;
}
```

**レスポンス**:
```typescript
interface Project {
  id: string;                    // UUID
  title: string;
  description: string | null;
  createdAt: string;             // ISO 8601
  updatedAt: string;             // ISO 8601
  status: 'pending' | 'processing' | 'completed' | 'failed';
  audioFilePath: string;
  audioFileName: string;
  audioFileSize: number;
  audioDuration: number | null;
  audioFormat: string;
}
```

**使用例**:
```typescript
const project = await window.electronAPI.project.create({
  title: '2026年1月 営業会議',
  description: '第1四半期の営業戦略会議',
  audioFilePath: '/path/to/meeting.mp3',
  audioFileName: 'meeting.mp3',
  audioFileSize: 45200000,
  audioDuration: 5400,
  audioFormat: 'mp3'
});
```

**エラー**:
- `FILE_NOT_FOUND`: ファイルが存在しない
- `INVALID_FILE_FORMAT`: 対応していないファイル形式
- `DATABASE_ERROR`: データベースエラー

---

### 1.2 プロジェクト一覧取得

**メソッド**: `project:findAll`

**説明**: プロジェクト一覧を取得（フィルタ・ソート対応）

**リクエスト**:
```typescript
interface FindAllProjectsRequest {
  status?: 'pending' | 'processing' | 'completed' | 'failed';
  search?: string;               // タイトル・ファイル名で検索
  sortBy?: 'createdAt' | 'updatedAt' | 'title';
  sortOrder?: 'asc' | 'desc';
  limit?: number;
  offset?: number;
}
```

**レスポンス**:
```typescript
interface FindAllProjectsResponse {
  projects: Project[];
  total: number;
  limit: number;
  offset: number;
}
```

**使用例**:
```typescript
const result = await window.electronAPI.project.findAll({
  status: 'completed',
  sortBy: 'createdAt',
  sortOrder: 'desc',
  limit: 20,
  offset: 0
});
```

---

### 1.3 プロジェクト詳細取得

**メソッド**: `project:findById`

**説明**: 指定したIDのプロジェクトを取得

**リクエスト**:
```typescript
interface FindByIdRequest {
  id: string;
}
```

**レスポンス**:
```typescript
Project | null
```

**使用例**:
```typescript
const project = await window.electronAPI.project.findById('uuid-xxxx');
```

**エラー**:
- `NOT_FOUND`: プロジェクトが見つからない

---

### 1.4 プロジェクト更新

**メソッド**: `project:update`

**説明**: プロジェクト情報を更新

**リクエスト**:
```typescript
interface UpdateProjectRequest {
  id: string;
  title?: string;
  description?: string;
  status?: 'pending' | 'processing' | 'completed' | 'failed';
}
```

**レスポンス**:
```typescript
Project
```

**使用例**:
```typescript
const updated = await window.electronAPI.project.update('uuid-xxxx', {
  title: '2026年1月 営業会議（更新版）',
  status: 'completed'
});
```

---

### 1.5 プロジェクト削除

**メソッド**: `project:delete`

**説明**: プロジェクトを削除（CASCADE DELETE）

**リクエスト**:
```typescript
interface DeleteProjectRequest {
  id: string;
}
```

**レスポンス**:
```typescript
{
  success: boolean;
  deletedId: string;
}
```

**使用例**:
```typescript
await window.electronAPI.project.delete('uuid-xxxx');
```

**注意**:
- 関連する文字起こし、セグメント、話者、要約も全て削除されます

---

## 2. Transcription API

### 2.1 文字起こし開始

**メソッド**: `transcription:start`

**説明**: 音声ファイルの文字起こしを開始

**リクエスト**:
```typescript
interface StartTranscriptionRequest {
  projectId: string;
  language?: string;             // デフォルト: 'ja'
  model?: string;                // デフォルト: 'whisper-1'
}
```

**レスポンス**:
```typescript
{
  success: boolean;
  projectId: string;
  message: string;
}
```

**使用例**:
```typescript
await window.electronAPI.transcription.start({
  projectId: 'uuid-xxxx',
  language: 'ja'
});

// 進捗イベントを監視
const unsubscribe = window.electronAPI.transcription.onProgress((progress) => {
  console.log(`Progress: ${progress.percentage}%`);
  console.log(`Status: ${progress.message}`);
});
```

**進捗イベント**:
```typescript
interface TranscriptionProgress {
  projectId: string;
  status: 'validating' | 'splitting' | 'transcribing' | 'merging' | 'completed' | 'failed';
  percentage: number;            // 0-100
  message: string;
  currentChunk?: number;
  totalChunks?: number;
  estimatedTimeRemaining?: number; // 秒
}
```

---

### 2.2 文字起こし結果取得

**メソッド**: `transcription:getByProjectId`

**説明**: プロジェクトの文字起こし結果を取得

**リクエスト**:
```typescript
interface GetTranscriptionRequest {
  projectId: string;
  includeSegments?: boolean;     // デフォルト: true
}
```

**レスポンス**:
```typescript
interface Transcription {
  id: string;
  projectId: string;
  content: string;               // 全文
  language: string;
  createdAt: string;
  updatedAt: string;
  segments?: Segment[];
}

interface Segment {
  id: string;
  transcriptionId: string;
  startTime: number;             // 秒
  endTime: number;
  text: string;
  speakerId: string | null;      // Phase 2
  confidence: number;            // 0-1
  sequenceNumber: number;
}
```

**使用例**:
```typescript
const transcription = await window.electronAPI.transcription.getByProjectId({
  projectId: 'uuid-xxxx',
  includeSegments: true
});
```

---

### 2.3 セグメント更新

**メソッド**: `transcription:updateSegment`

**説明**: セグメントのテキストを更新

**リクエスト**:
```typescript
interface UpdateSegmentRequest {
  segmentId: string;
  text: string;
}
```

**レスポンス**:
```typescript
Segment
```

**使用例**:
```typescript
const updated = await window.electronAPI.transcription.updateSegment({
  segmentId: 'segment-uuid',
  text: '修正後のテキスト'
});
```

**注意**:
- セグメント更新時に、transcriptions.contentも自動的に再生成されます

---

### 2.4 文字起こしキャンセル

**メソッド**: `transcription:cancel`

**説明**: 処理中の文字起こしをキャンセル

**リクエスト**:
```typescript
interface CancelTranscriptionRequest {
  projectId: string;
}
```

**レスポンス**:
```typescript
{
  success: boolean;
  projectId: string;
}
```

**使用例**:
```typescript
await window.electronAPI.transcription.cancel({
  projectId: 'uuid-xxxx'
});
```

---

## 3. File API

### 3.1 ファイル選択

**メソッド**: `file:select`

**説明**: ネイティブファイル選択ダイアログを表示

**リクエスト**:
```typescript
interface SelectFileRequest {
  filters?: {
    name: string;
    extensions: string[];
  }[];
}
```

**レスポンス**:
```typescript
{
  filePath: string | null;
  fileName: string | null;
  fileSize: number | null;
  canceled: boolean;
}
```

**使用例**:
```typescript
const result = await window.electronAPI.file.select({
  filters: [
    { name: 'Audio Files', extensions: ['mp3', 'wav', 'm4a'] }
  ]
});

if (!result.canceled) {
  console.log('Selected:', result.filePath);
}
```

---

### 3.2 ファイル検証

**メソッド**: `file:validate`

**説明**: 音声ファイルの検証

**リクエスト**:
```typescript
interface ValidateFileRequest {
  filePath: string;
}
```

**レスポンス**:
```typescript
interface ValidateFileResponse {
  valid: boolean;
  error?: string;
  metadata?: {
    duration: number;            // 秒
    format: string;
    sampleRate: number;
    channels: number;
    bitrate: number;
  };
}
```

**使用例**:
```typescript
const validation = await window.electronAPI.file.validate({
  filePath: '/path/to/audio.mp3'
});

if (!validation.valid) {
  console.error('Invalid file:', validation.error);
}
```

**エラー**:
- `INVALID_FORMAT`: 対応していないファイル形式
- `FILE_CORRUPTED`: ファイルが破損している
- `FILE_TOO_LARGE`: ファイルサイズが大きすぎる（警告のみ、処理は可能）

---

## 4. Export API

### 4.1 JSON形式エクスポート

**メソッド**: `export:json`

**説明**: 文字起こし結果をJSON形式でエクスポート

**リクエスト**:
```typescript
interface ExportJsonRequest {
  projectId: string;
  includeMetadata?: boolean;     // デフォルト: true
  includeTimestamps?: boolean;   // デフォルト: true
  includeConfidence?: boolean;   // デフォルト: true
  includeSpeakers?: boolean;     // Phase 2, デフォルト: false
}
```

**レスポンス**:
```typescript
{
  success: boolean;
  filePath: string;              // 保存先パス
}
```

**エクスポートされるJSON形式**:
```json
{
  "projectId": "uuid-xxxx",
  "title": "2026年1月 営業会議",
  "audioFile": "meeting.mp3",
  "duration": 5400,
  "exportedAt": "2026-01-03T14:30:00Z",
  "transcription": {
    "id": "transcription-uuid",
    "language": "ja",
    "segments": [
      {
        "id": "segment-uuid-1",
        "startTime": 0.0,
        "endTime": 5.2,
        "text": "皆さん、おはようございます。",
        "confidence": 0.98,
        "speakerId": null,
        "sequenceNumber": 1
      }
    ]
  },
  "metadata": {
    "model": "whisper-1",
    "createdAt": "2026-01-03T10:00:00Z",
    "updatedAt": "2026-01-03T11:30:00Z"
  }
}
```

**使用例**:
```typescript
const result = await window.electronAPI.export.toJson({
  projectId: 'uuid-xxxx',
  includeMetadata: true
});

console.log('Exported to:', result.filePath);
```

---

### 4.2 Markdown形式エクスポート

**メソッド**: `export:markdown`

**説明**: 文字起こし結果をMarkdown形式でエクスポート

**リクエスト**:
```typescript
interface ExportMarkdownRequest {
  projectId: string;
  includeTimestamps?: boolean;   // デフォルト: true
  includeSpeakers?: boolean;     // Phase 2, デフォルト: false
  segmentSeparator?: 'newline' | 'paragraph'; // デフォルト: 'newline'
}
```

**レスポンス**:
```typescript
{
  success: boolean;
  filePath: string;
}
```

**エクスポートされるMarkdown形式**:
```markdown
# 2026年1月 営業会議

## 基本情報
- 音声ファイル: meeting.mp3
- 長さ: 1時間30分
- 作成日: 2026-01-03
- 言語: 日本語

## 文字起こし

[00:00:00] 皆さん、おはようございます。

[00:00:15] まず、第1四半期の売上目標について説明します。

[00:00:45] 新製品のローンチスケジュールですが、2月中旬を予定しています。

---
生成日: 2026-01-03 14:30:00
```

---

## 5. Settings API

### 5.1 設定取得

**メソッド**: `settings:get`

**説明**: 指定したキーの設定値を取得

**リクエスト**:
```typescript
interface GetSettingRequest {
  key: string;
}
```

**レスポンス**:
```typescript
{
  key: string;
  value: string;
  updatedAt: string;
}
```

**使用例**:
```typescript
const apiKey = await window.electronAPI.settings.get('openai_api_key');
```

**設定キー一覧**:
```typescript
type SettingKey =
  | 'openai_api_key'
  | 'anthropic_api_key'
  | 'whisper_model'
  | 'default_language'
  | 'auto_save_enabled'
  | 'auto_save_interval'
  | 'default_export_format';
```

---

### 5.2 設定保存

**メソッド**: `settings:set`

**説明**: 設定値を保存

**リクエスト**:
```typescript
interface SetSettingRequest {
  key: string;
  value: string;
}
```

**レスポンス**:
```typescript
{
  success: boolean;
  key: string;
  value: string;
}
```

**使用例**:
```typescript
await window.electronAPI.settings.set({
  key: 'openai_api_key',
  value: 'sk-xxxxxxxxxxxxxxxx'
});
```

**セキュリティ**:
- APIキーは暗号化して保存（electron-store使用）
- 環境変数またはOSキーチェーン利用も検討

---

## 6. Speaker API (Phase 2)

### 6.1 話者一覧取得

**メソッド**: `speaker:findByProjectId`

**説明**: プロジェクトの話者一覧を取得

**リクエスト**:
```typescript
interface FindSpeakersRequest {
  projectId: string;
}
```

**レスポンス**:
```typescript
interface Speaker {
  id: string;
  projectId: string;
  name: string;                  // "Speaker 1", "Speaker 2"
  customName: string | null;
  createdAt: string;
}

Speaker[]
```

---

### 6.2 話者名更新

**メソッド**: `speaker:updateName`

**説明**: 話者のカスタム名を更新

**リクエスト**:
```typescript
interface UpdateSpeakerNameRequest {
  speakerId: string;
  customName: string;
}
```

**レスポンス**:
```typescript
Speaker
```

---

## 7. Dictionary API (Phase 2)

### 7.1 辞書セット一覧取得

**メソッド**: `dictionary:findAllSets`

**説明**: すべての辞書セットを取得

**リクエスト**:
```typescript
interface FindDictionarySetsRequest {
  category?: string;
  isActive?: boolean;
}
```

**レスポンス**:
```typescript
interface DictionarySet {
  id: string;
  name: string;
  description: string | null;
  category: string;
  entryCount: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

DictionarySet[]
```

---

### 7.2 辞書エントリ一覧取得

**メソッド**: `dictionary:findEntries`

**説明**: 辞書セットのエントリを取得

**リクエスト**:
```typescript
interface FindDictionaryEntriesRequest {
  dictionarySetId: string;
  search?: string;
  limit?: number;
  offset?: number;
}
```

**レスポンス**:
```typescript
interface DictionaryEntry {
  id: string;
  dictionarySetId: string;
  word: string;
  reading: string | null;
  wordType: string | null;
  usageCount: number;
  createdAt: string;
  updatedAt: string;
}

{
  entries: DictionaryEntry[];
  total: number;
}
```

---

### 7.3 辞書エントリ追加

**メソッド**: `dictionary:addEntry`

**説明**: 辞書に単語を追加

**リクエスト**:
```typescript
interface AddDictionaryEntryRequest {
  dictionarySetId: string;
  word: string;
  reading?: string;
  wordType?: string;
}
```

**レスポンス**:
```typescript
DictionaryEntry
```

---

### 7.4 辞書インポート

**メソッド**: `dictionary:import`

**説明**: CSV/JSONから辞書をインポート

**リクエスト**:
```typescript
interface ImportDictionaryRequest {
  dictionarySetId: string;
  filePath: string;
  format: 'csv' | 'json';
}
```

**レスポンス**:
```typescript
{
  success: boolean;
  importedCount: number;
  skippedCount: number;
  errors: string[];
}
```

**CSV形式**:
```csv
word,reading,wordType
MRI,エムアールアイ,名詞
CT,シーティー,名詞
```

---

## 8. Summary API (Phase 3)

### 8.1 要約生成

**メソッド**: `summary:generate`

**説明**: AI要約を生成

**リクエスト**:
```typescript
interface GenerateSummaryRequest {
  transcriptionId: string;
  summaryType: 'brief' | 'detailed' | 'minutes' | 'action_items';
  model?: string;                // デフォルト: 'claude-3-opus-20240229'
  customPrompt?: string;
  temperature?: number;          // 0-1, デフォルト: 0.3
  maxTokens?: number;
}
```

**レスポンス**:
```typescript
interface Summary {
  id: string;
  transcriptionId: string;
  summaryType: string;
  content: string;
  model: string;
  version: number;
  parentSummaryId: string | null;
  isActive: boolean;
  generationParams: string;      // JSON
  createdAt: string;
  updatedAt: string;
}
```

**使用例**:
```typescript
const summary = await window.electronAPI.summary.generate({
  transcriptionId: 'uuid-xxxx',
  summaryType: 'minutes',
  model: 'claude-3-opus-20240229'
});
```

---

### 8.2 要約一覧取得

**メソッド**: `summary:findByTranscriptionId`

**説明**: 文字起こしの要約一覧を取得

**リクエスト**:
```typescript
interface FindSummariesRequest {
  transcriptionId: string;
  summaryType?: string;
  activeOnly?: boolean;          // デフォルト: false
}
```

**レスポンス**:
```typescript
Summary[]
```

---

### 8.3 要約のアクティブ化

**メソッド**: `summary:setActive`

**説明**: 要約をアクティブに設定

**リクエスト**:
```typescript
interface SetActiveSummaryRequest {
  summaryId: string;
}
```

**レスポンス**:
```typescript
{
  success: boolean;
  summaryId: string;
}
```

**注意**:
- 同じtranscriptionId + summaryTypeの他の要約は自動的にis_active=falseになります

---

### 8.4 要約バージョン履歴取得

**メソッド**: `summary:getVersionHistory`

**説明**: 要約のバージョン履歴を取得

**リクエスト**:
```typescript
interface GetVersionHistoryRequest {
  summaryId: string;
}
```

**レスポンス**:
```typescript
{
  current: Summary;
  history: Summary[];            // 親から子へのツリー構造
}
```

---

## 外部API

## 1. OpenAI Whisper API

### 概要

- **Base URL**: `https://api.openai.com/v1`
- **認証**: Bearer Token (API Key)
- **制限**: 25MB/ファイル
- **対応形式**: mp3, mp4, mpeg, mpga, m4a, wav, webm

### 1.1 音声文字起こし

**エンドポイント**: `POST /audio/transcriptions`

**リクエスト**:
```typescript
// multipart/form-data
{
  file: File;                    // 音声ファイル
  model: 'whisper-1';
  language?: string;             // ISO-639-1形式 (例: 'ja')
  prompt?: string;               // コンテキストヒント
  response_format?: 'json' | 'text' | 'srt' | 'verbose_json' | 'vtt';
  temperature?: number;          // 0-1
}
```

**レスポンス（verbose_json形式）**:
```typescript
interface WhisperResponse {
  task: 'transcribe';
  language: string;
  duration: number;
  text: string;
  segments: {
    id: number;
    seek: number;
    start: number;
    end: number;
    text: string;
    tokens: number[];
    temperature: number;
    avg_logprob: number;
    compression_ratio: number;
    no_speech_prob: number;
  }[];
}
```

**使用例**:
```typescript
const formData = new FormData();
formData.append('file', audioFile);
formData.append('model', 'whisper-1');
formData.append('language', 'ja');
formData.append('response_format', 'verbose_json');

const response = await axios.post(
  'https://api.openai.com/v1/audio/transcriptions',
  formData,
  {
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'multipart/form-data'
    }
  }
);
```

**レート制限**:
- 3 RPM (Requests Per Minute) for Free Tier
- 50 RPM for Pay-as-you-go

**エラーコード**:
- `400`: Invalid request
- `401`: Invalid API key
- `413`: File too large (> 25MB)
- `429`: Rate limit exceeded
- `500`: Server error

---

## 2. Anthropic Claude API (Phase 3)

### 概要

- **Base URL**: `https://api.anthropic.com/v1`
- **認証**: x-api-key Header
- **モデル**: claude-3-opus-20240229, claude-3-sonnet-20240229
- **最大トークン**: 200K (入力 + 出力)

### 2.1 メッセージ生成

**エンドポイント**: `POST /messages`

**リクエスト**:
```typescript
interface ClaudeRequest {
  model: string;
  max_tokens: number;
  messages: {
    role: 'user' | 'assistant';
    content: string;
  }[];
  system?: string;               // システムプロンプト
  temperature?: number;          // 0-1
  top_p?: number;
  top_k?: number;
  stop_sequences?: string[];
}
```

**レスポンス**:
```typescript
interface ClaudeResponse {
  id: string;
  type: 'message';
  role: 'assistant';
  content: {
    type: 'text';
    text: string;
  }[];
  model: string;
  stop_reason: 'end_turn' | 'max_tokens' | 'stop_sequence';
  usage: {
    input_tokens: number;
    output_tokens: number;
  };
}
```

**使用例（要約生成）**:
```typescript
const response = await axios.post(
  'https://api.anthropic.com/v1/messages',
  {
    model: 'claude-3-opus-20240229',
    max_tokens: 4000,
    messages: [
      {
        role: 'user',
        content: `以下の文字起こしから議事録を作成してください。\n\n${transcriptionText}`
      }
    ],
    system: '会議の議事録を作成する専門家として振る舞ってください。',
    temperature: 0.3
  },
  {
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json'
    }
  }
);
```

**レート制限**:
- Claude 3 Opus: 5 RPM (Free Tier)
- Claude 3 Sonnet: 50 RPM (Free Tier)

**エラーコード**:
- `400`: Invalid request
- `401`: Invalid API key
- `429`: Rate limit exceeded
- `529`: Overloaded

---

## データ型定義

### 共通型

```typescript
// UUID
type UUID = string;

// ISO 8601 Date
type ISODate = string;

// ステータス
type ProjectStatus = 'pending' | 'processing' | 'completed' | 'failed';
type TranscriptionStatus = 'validating' | 'splitting' | 'transcribing' | 'merging' | 'completed' | 'failed';

// エクスポート形式
type ExportFormat = 'json' | 'markdown' | 'text';

// 要約タイプ
type SummaryType = 'brief' | 'detailed' | 'minutes' | 'action_items';
```

### エンティティ型

```typescript
interface Project {
  id: UUID;
  title: string;
  description: string | null;
  createdAt: ISODate;
  updatedAt: ISODate;
  status: ProjectStatus;
  audioFilePath: string;
  audioFileName: string;
  audioFileSize: number;
  audioDuration: number | null;
  audioFormat: string;
}

interface Transcription {
  id: UUID;
  projectId: UUID;
  content: string;
  language: string;
  createdAt: ISODate;
  updatedAt: ISODate;
}

interface Segment {
  id: UUID;
  transcriptionId: UUID;
  startTime: number;
  endTime: number;
  text: string;
  speakerId: UUID | null;
  confidence: number;
  sequenceNumber: number;
}

interface Speaker {
  id: UUID;
  projectId: UUID;
  name: string;
  customName: string | null;
  createdAt: ISODate;
}

interface DictionarySet {
  id: UUID;
  name: string;
  description: string | null;
  category: string;
  entryCount: number;
  isActive: boolean;
  createdAt: ISODate;
  updatedAt: ISODate;
}

interface DictionaryEntry {
  id: UUID;
  dictionarySetId: UUID;
  word: string;
  reading: string | null;
  wordType: string | null;
  usageCount: number;
  createdAt: ISODate;
  updatedAt: ISODate;
}

interface Summary {
  id: UUID;
  transcriptionId: UUID;
  summaryType: SummaryType;
  content: string;
  model: string;
  version: number;
  parentSummaryId: UUID | null;
  isActive: boolean;
  generationParams: string;      // JSON string
  createdAt: ISODate;
  updatedAt: ISODate;
}

interface Settings {
  key: string;
  value: string;
  updatedAt: ISODate;
}
```

---

## エラーハンドリング

### エラーレスポンス形式

```typescript
interface ErrorResponse {
  error: {
    code: string;
    message: string;
    details?: any;
  };
}
```

### エラーコード一覧

#### ファイル関連
- `FILE_NOT_FOUND`: ファイルが存在しない
- `INVALID_FILE_FORMAT`: 対応していないファイル形式
- `FILE_TOO_LARGE`: ファイルサイズが大きすぎる（警告）
- `FILE_CORRUPTED`: ファイルが破損している

#### データベース関連
- `DATABASE_ERROR`: データベースエラー
- `NOT_FOUND`: レコードが見つからない
- `DUPLICATE_ENTRY`: 重複エントリ

#### API関連
- `API_KEY_MISSING`: APIキーが設定されていない
- `API_KEY_INVALID`: APIキーが無効
- `API_RATE_LIMIT`: レート制限超過
- `API_ERROR`: API呼び出しエラー
- `API_TIMEOUT`: APIタイムアウト

#### 処理関連
- `TRANSCRIPTION_FAILED`: 文字起こし失敗
- `TRANSCRIPTION_CANCELED`: 文字起こしキャンセル
- `EXPORT_FAILED`: エクスポート失敗
- `VALIDATION_ERROR`: バリデーションエラー

### エラーハンドリング例

```typescript
try {
  const project = await window.electronAPI.project.create(data);
} catch (error) {
  if (error.code === 'FILE_NOT_FOUND') {
    alert('ファイルが見つかりません');
  } else if (error.code === 'INVALID_FILE_FORMAT') {
    alert('対応していないファイル形式です');
  } else {
    console.error('Unexpected error:', error);
    alert('エラーが発生しました');
  }
}
```

---

## レート制限とリトライ戦略

### Whisper API

**制限**:
- Free Tier: 3 RPM
- Pay-as-you-go: 50 RPM

**リトライ戦略**:
```typescript
async function callWhisperAPIWithRetry(file: File, maxRetries = 3) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await callWhisperAPI(file);
    } catch (error) {
      if (error.status === 429 && attempt < maxRetries) {
        const delay = Math.pow(2, attempt) * 1000; // 指数バックオフ
        await sleep(delay);
        continue;
      }
      throw error;
    }
  }
}
```

### Claude API

**制限**:
- Opus: 5 RPM (Free), 50 RPM (Paid)
- Sonnet: 50 RPM (Free), 1000 RPM (Paid)

**リトライ戦略**: Whisper APIと同様

---

## セキュリティ

### APIキー管理

1. **保存場所**:
   - Development: `.env`ファイル（.gitignoreに追加）
   - Production: OSキーチェーン（electron-store + keytar）

2. **暗号化**:
   ```typescript
   import Store from 'electron-store';

   const store = new Store({
     encryptionKey: 'your-encryption-key'
   });

   store.set('openai_api_key', apiKey);
   ```

3. **アクセス制限**:
   - Renderer Processから直接APIキーにアクセス不可
   - Main Processでのみ使用

### CORS対策

Electronアプリなので基本的に不要。ただし、外部APIはMain Processから呼び出す。

---

## ベストプラクティス

### 1. エラーハンドリング

```typescript
// 常にtry-catchでラップ
try {
  const result = await window.electronAPI.project.create(data);
  // 成功処理
} catch (error) {
  // エラーハンドリング
  console.error(error);
  showErrorToast(error.message);
}
```

### 2. 進捗監視

```typescript
// 長時間処理は進捗イベントを監視
const unsubscribe = window.electronAPI.transcription.onProgress((progress) => {
  updateProgressBar(progress.percentage);
});

await window.electronAPI.transcription.start({ projectId });

unsubscribe(); // クリーンアップ
```

### 3. キャンセル処理

```typescript
// ユーザーがキャンセルできるようにする
const cancelButton = document.getElementById('cancel');
cancelButton.addEventListener('click', async () => {
  await window.electronAPI.transcription.cancel({ projectId });
});
```

### 4. バリデーション

```typescript
// クライアント側でも事前バリデーション
if (!audioFile) {
  throw new Error('ファイルが選択されていません');
}

if (audioFile.size > 100 * 1024 * 1024) {
  if (!confirm('ファイルサイズが大きいため処理に時間がかかります。続行しますか？')) {
    return;
  }
}
```

---

**最終更新**: 2026-01-03
**バージョン**: 1.0
