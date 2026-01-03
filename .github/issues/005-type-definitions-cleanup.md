# [P1] 型定義の整理と一元化

## 問題の説明

現在、`shared/types/electron.ts`と`electron/preload.ts`で型定義が重複しており、以下の問題があります：

1. `ElectronAPI`インターフェースが`preload.ts`で独自定義されている
2. `shared/types/electron.ts`の型が十分に活用されていない
3. import/export関係が不明確
4. 型の一貫性が保証されていない

### 影響範囲

- 型定義の変更時に複数ファイルを修正する必要がある
- 型の不整合が発生しやすい
- コード補完が正しく機能しない可能性

## 期待される結果

1. すべてのElectron関連の型を`shared/types/`で一元管理
2. `preload.ts`は型定義をimportして使用
3. DRY原則に従った型定義
4. 型の変更が一箇所で完結

## 実装提案

### 1. shared/types/の構造化

```
shared/types/
├── index.ts           # 全型のexport
├── electron.ts        # Electron IPC型
├── database.ts        # Database型
├── transcription.ts   # Transcription型
└── common.ts          # 共通型
```

### 2. 型定義の分離

`shared/types/electron.ts`:
```typescript
// Project types
export interface Project {
  id: string
  title: string
  description?: string
  created_at: Date
  updated_at: Date
  status: 'pending' | 'processing' | 'completed' | 'failed'
  audio_file_path: string
  audio_file_name: string
  audio_file_size?: number
  audio_duration?: number
  audio_format?: string
}

export interface CreateProjectData {
  title: string
  description?: string
  audio_file_path: string
  audio_file_name: string
  audio_file_size?: number
  audio_duration?: number
  audio_format?: string
}

export interface UpdateProjectData {
  title?: string
  description?: string
  status?: Project['status']
}

export interface ProjectFilter {
  status?: Project['status']
  search?: string
}

// ... (他の型定義)

// ElectronAPI定義
export interface ElectronAPI {
  ping: () => Promise<string>
  project: {
    create: (data: CreateProjectData) => Promise<Project>
    findAll: (filter?: ProjectFilter) => Promise<Project[]>
    findById: (id: string) => Promise<Project>
    update: (id: string, updates: UpdateProjectData) => Promise<Project>
    delete: (id: string) => Promise<void>
  }
  transcription: {
    start: (filePath: string, projectId: string) => Promise<void>
    getByProjectId: (projectId: string) => Promise<Transcription>
    updateSegment: (segmentId: string, text: string) => Promise<Segment>
    onProgress: (callback: (progress: TranscriptionProgress) => void) => () => void
  }
  file: {
    select: () => Promise<string | null>
    validate: (filePath: string) => Promise<FileValidationResult>
  }
  export: {
    toJson: (projectId: string) => Promise<void>
    toMarkdown: (projectId: string) => Promise<void>
  }
  settings: {
    get: (key: string) => Promise<SettingValue>
    set: (key: string, value: SettingValue) => Promise<void>
  }
}

// Window拡張
declare global {
  interface Window {
    electronAPI: ElectronAPI
  }
}
```

### 3. preload.tsのリファクタリング

`electron/preload.ts`:
```typescript
import { contextBridge, ipcRenderer, IpcRendererEvent } from 'electron'
import type {
  ElectronAPI,
  CreateProjectData,
  ProjectFilter,
  UpdateProjectData,
  TranscriptionProgress,
  SettingValue,
} from '@shared/types/electron'

// 型定義は削除し、importのみ使用
contextBridge.exposeInMainWorld('electronAPI', {
  ping: () => ipcRenderer.invoke('ping'),

  project: {
    create: (data: CreateProjectData) => ipcRenderer.invoke('project:create', data),
    findAll: (filter?: ProjectFilter) => ipcRenderer.invoke('project:findAll', filter),
    findById: (id: string) => ipcRenderer.invoke('project:findById', id),
    update: (id: string, updates: UpdateProjectData) =>
      ipcRenderer.invoke('project:update', id, updates),
    delete: (id: string) => ipcRenderer.invoke('project:delete', id),
  },

  transcription: {
    start: (filePath: string, projectId: string) =>
      ipcRenderer.invoke('transcription:start', filePath, projectId),
    getByProjectId: (projectId: string) =>
      ipcRenderer.invoke('transcription:getByProjectId', projectId),
    updateSegment: (segmentId: string, text: string) =>
      ipcRenderer.invoke('transcription:updateSegment', segmentId, text),
    onProgress: (callback: (progress: TranscriptionProgress) => void) => {
      const subscription = (_event: IpcRendererEvent, progress: TranscriptionProgress) =>
        callback(progress)
      ipcRenderer.on('transcription:progress', subscription)
      return () => ipcRenderer.removeListener('transcription:progress', subscription)
    },
  },

  file: {
    select: () => ipcRenderer.invoke('file:select'),
    validate: (filePath: string) => ipcRenderer.invoke('file:validate', filePath),
  },

  export: {
    toJson: (projectId: string) => ipcRenderer.invoke('export:json', projectId),
    toMarkdown: (projectId: string) => ipcRenderer.invoke('export:markdown', projectId),
  },

  settings: {
    get: (key: string) => ipcRenderer.invoke('settings:get', key),
    set: (key: string, value: SettingValue) => ipcRenderer.invoke('settings:set', key, value),
  },
} satisfies ElectronAPI) // 型検証を追加
```

### 4. index.tsで一括export

`shared/types/index.ts`:
```typescript
// Electron types
export type {
  Project,
  CreateProjectData,
  UpdateProjectData,
  ProjectFilter,
  Transcription,
  Segment,
  TranscriptionProgress,
  FileValidationResult,
  SettingValue,
  ElectronAPI,
} from './electron'

// Database types
export type { DatabaseConfig, MigrationInfo } from './database'

// Transcription types
export type { WhisperConfig, ClaudeConfig } from './transcription'

// Common types
export type { Result, AsyncResult, ErrorCode } from './common'
```

## 受け入れ基準

- [ ] 全型定義が`shared/types/`に集約されている
- [ ] `preload.ts`は型をimportして使用している
- [ ] `satisfies`キーワードで型検証されている
- [ ] 型定義の重複が解消されている
- [ ] すべてのファイルで型エラーがない
- [ ] コード補完が正しく動作する

## ラベル

`priority:p1`, `type:enhancement`, `phase:1`

## マイルストーン

Phase 1 - MVP
