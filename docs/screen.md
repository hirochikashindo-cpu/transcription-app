# 画面設計書 (Screen Design)

## 概要

このドキュメントでは、Transcription Appの全画面について詳細に説明します。

**フレームワーク**: React 18
**ルーティング**: React Router v6
**状態管理**: Zustand
**スタイリング**: CSS Modules + CSS Variables

---

## 画面一覧

| 画面名 | パス | 説明 | Phase |
|--------|------|------|-------|
| ダッシュボード | `/` | プロジェクト一覧表示 | 1 |
| プロジェクト作成 | `/projects/new` | 新規プロジェクト作成 | 1 |
| プロジェクト詳細 | `/projects/:id` | プロジェクトの詳細情報 | 1 |
| 文字起こしエディタ | `/projects/:id/edit` | 文字起こし結果の編集 | 1 |
| 設定画面 | `/settings` | アプリケーション設定 | 1 |

**Phase 2以降の追加画面**:
- カスタム辞書管理 (`/dictionaries`)
- 話者管理 (`/projects/:id/speakers`)

---

## 1. ダッシュボード (`/`)

### 概要

プロジェクトの一覧表示と検索・フィルタリング機能を提供する画面。

### レイアウト

```
┌─────────────────────────────────────────────────┐
│ Header                                          │
│ ┌─────────────────┐  ┌──────────────────────┐  │
│ │ Transcription   │  │ [+ 新規プロジェクト]  │  │
│ │ App             │  │                      │  │
│ └─────────────────┘  └──────────────────────┘  │
├─────────────────────────────────────────────────┤
│ SearchBar & Filters                             │
│ ┌─────────────────────────────────────────────┐ │
│ │ 🔍 プロジェクトを検索...                     │ │
│ └─────────────────────────────────────────────┘ │
│ [すべて] [処理中] [完了] [エラー]               │
├─────────────────────────────────────────────────┤
│ ProjectGrid                                     │
│ ┌──────────┐ ┌──────────┐ ┌──────────┐        │
│ │ Project  │ │ Project  │ │ Project  │        │
│ │ Card 1   │ │ Card 2   │ │ Card 3   │        │
│ │          │ │          │ │          │        │
│ │ [詳細]   │ │ [詳細]   │ │ [詳細]   │        │
│ └──────────┘ └──────────┘ └──────────┘        │
│ ...                                             │
└─────────────────────────────────────────────────┘
```

### コンポーネント階層

```
DashboardPage
├─ Header
│  ├─ AppLogo
│  └─ NewProjectButton
│     └─ onClick → navigate('/projects/new')
├─ SearchAndFilterBar
│  ├─ SearchInput
│  │  └─ onChange → updateSearch(value)
│  └─ FilterButtons
│     ├─ FilterButton (すべて)
│     ├─ FilterButton (処理中)
│     ├─ FilterButton (完了)
│     └─ FilterButton (エラー)
└─ ProjectGrid
   └─ ProjectCard[] (複数)
      ├─ ProjectThumbnail
      │  └─ AudioIcon / StatusBadge
      ├─ ProjectInfo
      │  ├─ Title
      │  ├─ CreatedDate
      │  └─ Duration
      └─ ActionButtons
         ├─ DetailButton → navigate(`/projects/${id}`)
         └─ DeleteButton → confirmDelete(id)
```

### 状態管理 (Zustand Store)

```typescript
// src/store/projectStore.ts
interface ProjectStore {
  projects: Project[]
  filter: 'all' | 'pending' | 'processing' | 'completed' | 'failed'
  searchQuery: string

  fetchProjects: () => Promise<void>
  setFilter: (filter: string) => void
  setSearchQuery: (query: string) => void
  deleteProject: (id: string) => Promise<void>
}
```

### UIコンポーネント仕様

#### ProjectCard

**Props**:
```typescript
interface ProjectCardProps {
  project: Project
  onDetail: (id: string) => void
  onDelete: (id: string) => void
}
```

**表示内容**:
- プロジェクトタイトル
- 作成日時 (相対時間表示: "2時間前")
- ステータスバッジ (色分け)
- 音声ファイル名
- 音声の長さ (hh:mm:ss)

**ステータスバッジの色**:
- `pending`: グレー
- `processing`: ブルー (アニメーション付き)
- `completed`: グリーン
- `failed`: レッド

---

## 2. プロジェクト作成 (`/projects/new`)

### 概要

新規プロジェクトを作成する画面。音声ファイルを選択し、プロジェクト情報を入力。

### レイアウト

```
┌─────────────────────────────────────────────────┐
│ Header                                          │
│ [← 戻る]  新規プロジェクト作成                  │
├─────────────────────────────────────────────────┤
│ Form                                            │
│ ┌─────────────────────────────────────────────┐ │
│ │ プロジェクト名 *                             │ │
│ │ ┌─────────────────────────────────────────┐ │ │
│ │ │                                         │ │ │
│ │ └─────────────────────────────────────────┘ │ │
│ │                                             │ │
│ │ 説明 (オプション)                           │ │
│ │ ┌─────────────────────────────────────────┐ │ │
│ │ │                                         │ │ │
│ │ │                                         │ │ │
│ │ └─────────────────────────────────────────┘ │ │
│ │                                             │ │
│ │ 音声ファイル *                              │ │
│ │ ┌─────────────────────────────────────────┐ │ │
│ │ │ ドラッグ＆ドロップ または [選択]         │ │ │
│ │ │                                         │ │ │
│ │ └─────────────────────────────────────────┘ │ │
│ │ 対応形式: MP3, WAV, M4A                     │ │
│ │                                             │ │
│ │               [キャンセル] [作成して開始]   │ │
│ └─────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────┘
```

### コンポーネント階層

```
NewProjectPage
├─ Header
│  └─ BackButton → navigate('/')
├─ ProjectForm
│  ├─ FormField (プロジェクト名)
│  │  └─ Input
│  ├─ FormField (説明)
│  │  └─ Textarea
│  ├─ FileDropZone
│  │  ├─ DropArea
│  │  │  └─ onDrop → handleFileDrop(files)
│  │  └─ FileSelectButton
│  │     └─ onClick → openFileDialog()
│  └─ FormActions
│     ├─ CancelButton → navigate('/')
│     └─ SubmitButton → handleSubmit()
```

### バリデーション

- **プロジェクト名**: 必須、1-100文字
- **説明**: オプション、最大500文字
- **音声ファイル**:
  - 必須
  - 対応形式: `.mp3`, `.wav`, `.m4a`, `.aac`, `.flac`
  - 最大サイズ: 制限なし（Whisper APIが25MB制限なので自動分割）

### エラーハンドリング

- ファイル形式不正 → "対応していないファイル形式です"
- ファイル読み込み失敗 → "ファイルの読み込みに失敗しました"

---

## 3. プロジェクト詳細 (`/projects/:id`)

### 概要

プロジェクトの詳細情報と文字起こし結果を表示する画面。

### レイアウト

```
┌─────────────────────────────────────────────────┐
│ Header                                          │
│ [← 戻る]  プロジェクト詳細                      │
├─────────────────────────────────────────────────┤
│ ProjectInfo                                     │
│ ┌─────────────────────────────────────────────┐ │
│ │ プロジェクト名                               │ │
│ │ ステータス: [完了]                           │ │
│ │ 作成日時: 2026-01-03 10:00                   │ │
│ │ 音声ファイル: meeting.mp3 (15.0 MB)         │ │
│ │ 長さ: 01:00:30                               │ │
│ │                                             │ │
│ │ [編集] [エクスポート] [削除]                 │ │
│ └─────────────────────────────────────────────┘ │
├─────────────────────────────────────────────────┤
│ TranscriptionView                               │
│ ┌─────────────────────────────────────────────┐ │
│ │ [00:00:00] おはようございます。             │ │
│ │ [00:00:05] 本日の会議を始めます。           │ │
│ │ [00:00:10] まず、前回の議事録を...          │ │
│ │ ...                                         │ │
│ └─────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────┘
```

### コンポーネント階層

```
ProjectDetailPage
├─ Header
│  └─ BackButton
├─ ProjectInfoPanel
│  ├─ ProjectTitle
│  ├─ ProjectMeta
│  │  ├─ StatusBadge
│  │  ├─ CreatedDate
│  │  ├─ AudioFileInfo
│  │  └─ Duration
│  └─ ActionButtons
│     ├─ EditButton → navigate(`/projects/${id}/edit`)
│     ├─ ExportButton → openExportDialog()
│     └─ DeleteButton → confirmDelete()
├─ TranscriptionViewer
│  └─ SegmentList
│     └─ SegmentItem[] (複数)
│        ├─ Timestamp
│        └─ Text
```

### 状態管理

```typescript
interface ProjectDetailStore {
  project: Project | null
  transcription: Transcription | null
  segments: Segment[]

  fetchProjectDetail: (id: string) => Promise<void>
  exportTranscription: (format: 'json' | 'markdown') => Promise<void>
  deleteProject: (id: string) => Promise<void>
}
```

---

## 4. 文字起こしエディタ (`/projects/:id/edit`)

### 概要

文字起こし結果を編集する画面。セグメント単位での編集が可能。

### レイアウト

```
┌─────────────────────────────────────────────────┐
│ Header                                          │
│ [← 戻る]  文字起こし編集                        │
├─────────────────────────────────────────────────┤
│ EditorToolbar                                   │
│ [保存] [元に戻す] [やり直し]                    │
├─────────────────────────────────────────────────┤
│ SegmentEditor                                   │
│ ┌─────────────────────────────────────────────┐ │
│ │ [00:00:00 - 00:00:05]                       │ │
│ │ ┌─────────────────────────────────────────┐ │ │
│ │ │ おはようございます。                     │ │ │
│ │ └─────────────────────────────────────────┘ │ │
│ │                                             │ │
│ │ [00:00:05 - 00:00:10]                       │ │
│ │ ┌─────────────────────────────────────────┐ │ │
│ │ │ 本日の会議を始めます。                   │ │ │
│ │ └─────────────────────────────────────────┘ │ │
│ │ ...                                         │ │
│ └─────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────┘
```

### コンポーネント階層

```
TranscriptionEditorPage
├─ Header
│  └─ BackButton
├─ EditorToolbar
│  ├─ SaveButton → saveChanges()
│  ├─ UndoButton → undo()
│  └─ RedoButton → redo()
└─ SegmentEditor
   └─ EditableSegmentList
      └─ EditableSegment[] (複数)
         ├─ TimeRange (読み取り専用)
         └─ EditableText
            └─ onBlur → updateSegment(id, text)
```

### 編集機能

- **テキスト編集**: 各セグメントのテキストを直接編集
- **自動保存**: 編集後3秒でデバウンス保存
- **変更追跡**: 変更があるセグメントを強調表示
- **Undo/Redo**: 編集履歴の管理

---

## 5. 設定画面 (`/settings`)

### 概要

APIキーの設定やアプリケーション設定を管理する画面。

### レイアウト

```
┌─────────────────────────────────────────────────┐
│ Header                                          │
│ [← 戻る]  設定                                  │
├─────────────────────────────────────────────────┤
│ SettingsSections                                │
│ ┌─────────────────────────────────────────────┐ │
│ │ API Keys                                    │ │
│ │ ┌─────────────────────────────────────────┐ │ │
│ │ │ OpenAI API Key                          │ │ │
│ │ │ ┌─────────────────────────────────────┐ │ │ │
│ │ │ │ sk-****************************     │ │ │ │
│ │ │ └─────────────────────────────────────┘ │ │ │
│ │ │ [保存]                                  │ │ │
│ │ └─────────────────────────────────────────┘ │ │
│ │                                             │ │
│ │ Anthropic API Key (Phase 3)                │ │
│ │ ┌─────────────────────────────────────────┐ │ │
│ │ │ sk-****************************         │ │ │
│ │ └─────────────────────────────────────────┘ │ │
│ └─────────────────────────────────────────────┘ │
│                                                 │
│ ┌─────────────────────────────────────────────┐ │
│ │ アプリケーション設定                         │ │
│ │ [✓] 文字起こし完了時に通知                  │ │
│ │ [✓] 自動保存を有効化                        │ │
│ └─────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────┘
```

### コンポーネント階層

```
SettingsPage
├─ Header
│  └─ BackButton
├─ ApiKeysSection
│  ├─ ApiKeyField (OpenAI)
│  │  ├─ MaskedInput
│  │  └─ SaveButton
│  └─ ApiKeyField (Anthropic)
│     ├─ MaskedInput
│     └─ SaveButton
└─ AppSettingsSection
   ├─ CheckboxField (通知)
   └─ CheckboxField (自動保存)
```

### セキュリティ

- **API Keyのマスキング**: 入力フィールドは常にマスク表示 (`sk-****...`)
- **暗号化保存**: ElectronのsafeStorage APIで暗号化してDB保存
- **ログ出力禁止**: API Keyは絶対にログに出力しない

---

## 共通コンポーネント

### Button

**Props**:
```typescript
interface ButtonProps {
  variant: 'primary' | 'secondary' | 'danger'
  size: 'small' | 'medium' | 'large'
  disabled?: boolean
  onClick: () => void
  children: React.ReactNode
}
```

### Modal

**Props**:
```typescript
interface ModalProps {
  isOpen: boolean
  onClose: () => void
  title: string
  children: React.ReactNode
}
```

### Toast Notification

**用途**:
- 成功メッセージ: "プロジェクトを作成しました"
- エラーメッセージ: "文字起こしに失敗しました"
- 情報メッセージ: "文字起こしを開始しました"

---

## レスポンシブ対応

Phase 1ではデスクトップのみ対応。最小ウィンドウサイズ: 800x600px

---

## アクセシビリティ

- **キーボードナビゲーション**: すべての操作がキーボードで可能
- **スクリーンリーダー対応**: ARIA属性の適切な使用
- **フォーカス管理**: モーダル開閉時の適切なフォーカス移動

---

## 参考資料

- [api.md](./api.md): IPC API仕様
- [React Router Documentation](https://reactrouter.com/)
- [Zustand Documentation](https://zustand-demo.pmnd.rs/)

---

**最終更新**: 2026-01-03
**バージョン**: 1.0 (Phase 1)
