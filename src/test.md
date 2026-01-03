# Transcription App - テスト仕様書

作成日: 2026-01-03

## 目次

1. [テスト戦略](#1-テスト戦略)
2. [テストツール](#2-テストツール)
3. [テストの種類](#3-テストの種類)
4. [Phase 1: MVP テストケース](#4-phase-1-mvp-テストケース)
5. [Phase 2: 拡張機能テストケース](#5-phase-2-拡張機能テストケース)
6. [Phase 3: AI機能テストケース](#6-phase-3-ai機能テストケース)
7. [パフォーマンステスト](#7-パフォーマンステスト)
8. [セキュリティテスト](#8-セキュリティテスト)
9. [テストデータ](#9-テストデータ)
10. [CI/CD統合](#10-cicd統合)

---

## 1. テスト戦略

### 1.1 テストピラミッド

```
        ┌──────────────┐
        │   E2E Tests  │  (10%)
        │    ~20 tests │
        ├──────────────┤
        │ Integration  │  (30%)
        │   ~60 tests  │
        ├──────────────┤
        │  Unit Tests  │  (60%)
        │  ~200 tests  │
        └──────────────┘
```

### 1.2 カバレッジ目標

| レイヤー | カバレッジ目標 | 重要度 |
|---------|---------------|--------|
| Utils/Services | 90% 以上 | 高 |
| Components | 80% 以上 | 高 |
| Hooks | 85% 以上 | 高 |
| Pages | 70% 以上 | 中 |
| Types/Constants | 100% | 中 |
| E2E Critical Path | 100% | 高 |

### 1.3 テスト方針

**優先順位**:
1. **Critical Path**: ユーザーが最も使用する機能を最優先
   - ファイルアップロード → 文字起こし → 結果表示 → エクスポート
2. **Edge Cases**: エラーハンドリング、境界値テスト
3. **Performance**: 長時間音声、大量データ
4. **Security**: APIキー管理、ファイルアクセス制御

**テストの原則**:
- **F.I.R.S.T原則**を遵守
  - Fast: 高速に実行
  - Independent: 独立して実行可能
  - Repeatable: 何度でも同じ結果
  - Self-validating: 自己検証可能
  - Timely: 実装と同時に作成

---

## 2. テストツール

### 2.1 テストフレームワーク

| ツール | 用途 | 設定ファイル |
|-------|------|-------------|
| **Vitest** | Unit/Integration Test | vitest.config.ts |
| **Testing Library** | React Component Test | - |
| **Playwright** | E2E Test | playwright.config.ts |
| **MSW** | API Mocking | tests/mocks/handlers.ts |
| **c8** | Code Coverage | vitest.config.ts |

### 2.2 追加ライブラリ

```json
{
  "devDependencies": {
    "@testing-library/react": "^14.1.2",
    "@testing-library/jest-dom": "^6.1.5",
    "@testing-library/user-event": "^14.5.1",
    "vitest": "^1.1.0",
    "@vitest/ui": "^1.1.0",
    "c8": "^9.0.0",
    "playwright": "^1.40.0",
    "msw": "^2.0.11",
    "fake-indexeddb": "^5.0.1"
  }
}
```

### 2.3 Mock ライブラリ

**better-sqlite3 Mock**:
```bash
npm install -D better-sqlite3-mock
```

**Electron Mock**:
```bash
npm install -D @electron/mock-api
```

---

## 3. テストの種類

### 3.1 Unit Test (単体テスト)

**対象**:
- Utils関数
- Custom Hooks
- Service層（純粋関数部分）
- Store (Zustand)

**実行コマンド**:
```bash
npm run test:unit
npm run test:unit -- --coverage
```

**ディレクトリ構成**:
```
tests/unit/
├── utils/
│   ├── formatTime.test.ts
│   ├── fileValidator.test.ts
│   └── exportFormatter.test.ts
├── hooks/
│   ├── useProject.test.ts
│   ├── useTranscription.test.ts
│   └── useAudioUpload.test.ts
├── store/
│   ├── projectStore.test.ts
│   ├── transcriptionStore.test.ts
│   └── settingsStore.test.ts
└── services/
    ├── whisperService.test.ts
    ├── databaseService.test.ts
    └── exportService.test.ts
```

### 3.2 Integration Test (統合テスト)

**対象**:
- Component + Hooks
- Service + Database
- IPC通信
- API統合

**実行コマンド**:
```bash
npm run test:integration
```

**ディレクトリ構成**:
```
tests/integration/
├── components/
│   ├── FileUpload.integration.test.tsx
│   ├── TranscriptEditor.integration.test.tsx
│   └── ProjectDashboard.integration.test.tsx
├── ipc/
│   ├── projectIPC.integration.test.ts
│   ├── transcriptionIPC.integration.test.ts
│   └── exportIPC.integration.test.ts
└── services/
    ├── transcription-flow.integration.test.ts
    ├── export-flow.integration.test.ts
    └── database-migration.integration.test.ts
```

### 3.3 E2E Test (End-to-End テスト)

**対象**:
- ユーザーフロー全体
- クリティカルパス
- クロスブラウザ/OS

**実行コマンド**:
```bash
npm run test:e2e
npm run test:e2e -- --headed  # ブラウザ表示
```

**ディレクトリ構成**:
```
tests/e2e/
├── transcription-flow.spec.ts
├── project-management.spec.ts
├── export-flow.spec.ts
├── settings.spec.ts
└── fixtures/
    ├── test-audio-short.mp3
    ├── test-audio-long.mp3
    └── test-audio-4hours.mp3
```

---

## 4. Phase 1: MVP テストケース

### 4.1 プロジェクト管理

#### 4.1.1 Unit Tests

**tests/unit/services/projectService.test.ts**:
```typescript
describe('ProjectService', () => {
  describe('createProject', () => {
    test('should create a new project with valid data', async () => {
      const projectData = {
        title: 'Test Project',
        audioFilePath: '/path/to/audio.mp3',
        audioFileName: 'audio.mp3',
        audioFileSize: 1024000,
        audioDuration: 300.5
      }

      const project = await projectService.createProject(projectData)

      expect(project.id).toBeDefined()
      expect(project.title).toBe('Test Project')
      expect(project.status).toBe('pending')
    })

    test('should throw error if required fields are missing', async () => {
      const invalidData = { title: 'Test' }

      await expect(projectService.createProject(invalidData))
        .rejects.toThrow('Missing required fields')
    })
  })

  describe('getProjectById', () => {
    test('should return project if exists', async () => {
      const project = await projectService.getProjectById('test-id')
      expect(project).toBeDefined()
    })

    test('should return null if project does not exist', async () => {
      const project = await projectService.getProjectById('non-existent-id')
      expect(project).toBeNull()
    })
  })

  describe('updateProjectStatus', () => {
    test('should update project status', async () => {
      const updated = await projectService.updateProjectStatus('test-id', 'completed')
      expect(updated.status).toBe('completed')
      expect(updated.updatedAt).toBeDefined()
    })

    test('should validate status values', async () => {
      await expect(projectService.updateProjectStatus('test-id', 'invalid'))
        .rejects.toThrow('Invalid status')
    })
  })
})
```

#### 4.1.2 Integration Tests

**tests/integration/components/ProjectDashboard.integration.test.tsx**:
```typescript
describe('ProjectDashboard Integration', () => {
  test('should display list of projects', async () => {
    const { getByText, getAllByRole } = render(<ProjectDashboard />)

    await waitFor(() => {
      expect(getAllByRole('article')).toHaveLength(3)
    })

    expect(getByText('Project 1')).toBeInTheDocument()
    expect(getByText('Project 2')).toBeInTheDocument()
  })

  test('should create new project when button is clicked', async () => {
    const { getByRole, getByText } = render(<ProjectDashboard />)
    const user = userEvent.setup()

    const createButton = getByRole('button', { name: /新規プロジェクト/i })
    await user.click(createButton)

    expect(getByText('プロジェクト作成')).toBeInTheDocument()
  })

  test('should filter projects by search term', async () => {
    const { getByRole, getAllByRole } = render(<ProjectDashboard />)
    const user = userEvent.setup()

    const searchInput = getByRole('searchbox')
    await user.type(searchInput, 'Project 1')

    await waitFor(() => {
      expect(getAllByRole('article')).toHaveLength(1)
    })
  })

  test('should sort projects by date', async () => {
    const { getByRole, getAllByRole } = render(<ProjectDashboard />)
    const user = userEvent.setup()

    const sortButton = getByRole('button', { name: /並び替え/i })
    await user.click(sortButton)

    const sortByDate = getByRole('menuitem', { name: /作成日/i })
    await user.click(sortByDate)

    const projects = getAllByRole('article')
    expect(projects[0]).toHaveTextContent('Project 3')
  })
})
```

#### 4.1.3 E2E Tests

**tests/e2e/project-management.spec.ts**:
```typescript
import { test, expect } from '@playwright/test'

test.describe('Project Management E2E', () => {
  test('should create, view, and delete a project', async ({ page }) => {
    await page.goto('/')

    // プロジェクト作成
    await page.click('button:has-text("新規プロジェクト")')
    await page.setInputFiles('input[type="file"]', 'tests/fixtures/test-audio-short.mp3')
    await page.fill('input[name="title"]', 'E2E Test Project')
    await page.click('button:has-text("作成")')

    // プロジェクト一覧に表示されることを確認
    await expect(page.locator('text=E2E Test Project')).toBeVisible()

    // プロジェクト詳細を表示
    await page.click('text=E2E Test Project')
    await expect(page.locator('h1:has-text("E2E Test Project")')).toBeVisible()

    // プロジェクト削除
    await page.click('button:has-text("削除")')
    await page.click('button:has-text("確認")')

    // 削除後、一覧に表示されないことを確認
    await expect(page.locator('text=E2E Test Project')).not.toBeVisible()
  })

  test('should search and filter projects', async ({ page }) => {
    await page.goto('/')

    const projectCount = await page.locator('[data-testid="project-card"]').count()
    expect(projectCount).toBeGreaterThan(0)

    // 検索
    await page.fill('input[placeholder="検索"]', 'Meeting')
    await expect(page.locator('[data-testid="project-card"]')).toHaveCount(1)

    // フィルタークリア
    await page.fill('input[placeholder="検索"]', '')
    await expect(page.locator('[data-testid="project-card"]')).toHaveCount(projectCount)
  })
})
```

### 4.2 ファイルアップロード

#### 4.2.1 Unit Tests

**tests/unit/utils/fileValidator.test.ts**:
```typescript
describe('FileValidator', () => {
  describe('validateAudioFile', () => {
    test('should accept valid audio formats', () => {
      const validFiles = [
        { name: 'audio.mp3', size: 1024000, type: 'audio/mpeg' },
        { name: 'audio.wav', size: 2048000, type: 'audio/wav' },
        { name: 'audio.m4a', size: 1536000, type: 'audio/mp4' }
      ]

      validFiles.forEach(file => {
        expect(fileValidator.validateAudioFile(file)).toBe(true)
      })
    })

    test('should reject invalid formats', () => {
      const invalidFile = { name: 'video.mp4', size: 1024000, type: 'video/mp4' }
      expect(() => fileValidator.validateAudioFile(invalidFile))
        .toThrow('不正なファイル形式です')
    })

    test('should reject files larger than 2GB', () => {
      const largeFile = {
        name: 'large.mp3',
        size: 3 * 1024 * 1024 * 1024, // 3GB
        type: 'audio/mpeg'
      }
      expect(() => fileValidator.validateAudioFile(largeFile))
        .toThrow('ファイルサイズが大きすぎます')
    })

    test('should reject empty files', () => {
      const emptyFile = { name: 'empty.mp3', size: 0, type: 'audio/mpeg' }
      expect(() => fileValidator.validateAudioFile(emptyFile))
        .toThrow('ファイルが空です')
    })
  })

  describe('estimateProcessingTime', () => {
    test('should estimate time for 1 hour audio', () => {
      const duration = 3600 // 1 hour
      const estimate = fileValidator.estimateProcessingTime(duration)
      expect(estimate).toBeGreaterThan(300) // > 5 minutes
      expect(estimate).toBeLessThan(900) // < 15 minutes
    })
  })
})
```

#### 4.2.2 Integration Tests

**tests/integration/components/FileUpload.integration.test.tsx**:
```typescript
describe('FileUpload Integration', () => {
  test('should upload and validate audio file', async () => {
    const { getByLabelText, getByText } = render(<FileUpload />)
    const user = userEvent.setup()

    const file = new File(['audio content'], 'test.mp3', { type: 'audio/mpeg' })
    const input = getByLabelText(/ファイルを選択/i)

    await user.upload(input, file)

    await waitFor(() => {
      expect(getByText('test.mp3')).toBeInTheDocument()
    })
  })

  test('should show error for invalid file', async () => {
    const { getByLabelText, getByRole } = render(<FileUpload />)
    const user = userEvent.setup()

    const file = new File(['content'], 'test.txt', { type: 'text/plain' })
    const input = getByLabelText(/ファイルを選択/i)

    await user.upload(input, file)

    await waitFor(() => {
      expect(getByRole('alert')).toHaveTextContent(/不正なファイル形式/)
    })
  })

  test('should show progress during upload', async () => {
    const { getByLabelText, getByRole } = render(<FileUpload />)
    const user = userEvent.setup()

    const file = new File(['audio content'], 'large.mp3', { type: 'audio/mpeg' })
    const input = getByLabelText(/ファイルを選択/i)

    await user.upload(input, file)

    expect(getByRole('progressbar')).toBeInTheDocument()
  })
})
```

### 4.3 文字起こし処理

#### 4.3.1 Unit Tests

**tests/unit/services/whisperService.test.ts**:
```typescript
describe('WhisperService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('transcribeAudio', () => {
    test('should transcribe short audio file', async () => {
      const mockResponse = {
        text: 'これはテスト音声です。',
        segments: [
          { id: 0, start: 0.0, end: 2.5, text: 'これはテスト音声です。' }
        ]
      }

      vi.mocked(axios.post).mockResolvedValue({ data: mockResponse })

      const result = await whisperService.transcribeAudio('/path/to/audio.mp3')

      expect(result.text).toBe('これはテスト音声です。')
      expect(result.segments).toHaveLength(1)
    })

    test('should handle API errors gracefully', async () => {
      vi.mocked(axios.post).mockRejectedValue(new Error('API Error'))

      await expect(whisperService.transcribeAudio('/path/to/audio.mp3'))
        .rejects.toThrow('文字起こしに失敗しました')
    })

    test('should retry on rate limit error', async () => {
      vi.mocked(axios.post)
        .mockRejectedValueOnce({ response: { status: 429 } })
        .mockResolvedValueOnce({ data: { text: 'success' } })

      const result = await whisperService.transcribeAudio('/path/to/audio.mp3')

      expect(result.text).toBe('success')
      expect(axios.post).toHaveBeenCalledTimes(2)
    })
  })

  describe('splitAudioFile', () => {
    test('should split large file into chunks', async () => {
      const fileSize = 50 * 1024 * 1024 // 50MB
      const chunks = await whisperService.splitAudioFile('/path/to/large.mp3', fileSize)

      expect(chunks.length).toBeGreaterThan(1)
      chunks.forEach(chunk => {
        expect(chunk.size).toBeLessThanOrEqual(25 * 1024 * 1024)
      })
    })

    test('should not split small files', async () => {
      const fileSize = 10 * 1024 * 1024 // 10MB
      const chunks = await whisperService.splitAudioFile('/path/to/small.mp3', fileSize)

      expect(chunks.length).toBe(1)
    })
  })

  describe('mergeTranscriptions', () => {
    test('should merge multiple transcriptions correctly', () => {
      const transcriptions = [
        {
          text: 'Part 1',
          segments: [{ id: 0, start: 0, end: 5, text: 'Part 1' }]
        },
        {
          text: 'Part 2',
          segments: [{ id: 0, start: 0, end: 5, text: 'Part 2' }]
        }
      ]

      const merged = whisperService.mergeTranscriptions(transcriptions, [5, 5])

      expect(merged.text).toBe('Part 1 Part 2')
      expect(merged.segments).toHaveLength(2)
      expect(merged.segments[1].start).toBe(5)
    })
  })
})
```

#### 4.3.2 Integration Tests

**tests/integration/services/transcription-flow.integration.test.ts**:
```typescript
describe('Transcription Flow Integration', () => {
  test('should complete full transcription flow', async () => {
    // 1. プロジェクト作成
    const project = await projectService.createProject({
      title: 'Integration Test',
      audioFilePath: '/fixtures/test-audio.mp3'
    })

    // 2. 文字起こし実行
    const transcription = await whisperService.transcribeAudio(project.audioFilePath)

    // 3. データベース保存
    const saved = await transcriptionService.saveTranscription({
      projectId: project.id,
      content: transcription.text,
      segments: transcription.segments
    })

    // 4. 検証
    expect(saved.id).toBeDefined()
    expect(saved.segments.length).toBeGreaterThan(0)

    // 5. プロジェクトステータス更新
    const updated = await projectService.updateProjectStatus(project.id, 'completed')
    expect(updated.status).toBe('completed')
  })

  test('should handle long audio file with splitting', async () => {
    const project = await projectService.createProject({
      title: 'Long Audio Test',
      audioFilePath: '/fixtures/test-audio-long.mp3',
      audioFileSize: 50 * 1024 * 1024 // 50MB
    })

    const progressCallback = vi.fn()
    const result = await whisperService.transcribeLongAudio(
      project.audioFilePath,
      progressCallback
    )

    expect(progressCallback).toHaveBeenCalled()
    expect(result.segments.length).toBeGreaterThan(10)
  })
})
```

#### 4.3.3 E2E Tests

**tests/e2e/transcription-flow.spec.ts**:
```typescript
test.describe('Transcription Flow E2E', () => {
  test('should transcribe short audio end-to-end', async ({ page }) => {
    await page.goto('/')

    // 新規プロジェクト作成
    await page.click('button:has-text("新規プロジェクト")')
    await page.setInputFiles('input[type="file"]', 'tests/fixtures/test-audio-short.mp3')
    await page.fill('input[name="title"]', 'Short Audio Test')
    await page.click('button:has-text("文字起こし開始")')

    // 処理中画面
    await expect(page.locator('text=処理中')).toBeVisible()
    await expect(page.locator('[role="progressbar"]')).toBeVisible()

    // 完了を待つ（最大2分）
    await page.waitForSelector('text=完了', { timeout: 120000 })

    // 結果画面に遷移
    await expect(page.locator('[data-testid="transcript-content"]')).toBeVisible()

    // セグメントが表示されている
    const segments = await page.locator('[data-testid="segment"]').count()
    expect(segments).toBeGreaterThan(0)
  })

  test('should show progress for long audio', async ({ page }) => {
    await page.goto('/')

    await page.click('button:has-text("新規プロジェクト")')
    await page.setInputFiles('input[type="file"]', 'tests/fixtures/test-audio-4hours.mp3')
    await page.fill('input[name="title"]', 'Long Audio Test')
    await page.click('button:has-text("文字起こし開始")')

    // 進捗が段階的に更新されることを確認
    await expect(page.locator('text=0%')).toBeVisible()
    await page.waitForFunction(() => {
      const progress = document.querySelector('[role="progressbar"]')
      return progress && parseInt(progress.getAttribute('aria-valuenow') || '0') > 0
    })
  })

  test('should handle API errors gracefully', async ({ page }) => {
    // MSWでAPIエラーをシミュレート
    await page.route('**/v1/audio/transcriptions', route => {
      route.abort('failed')
    })

    await page.goto('/')
    await page.click('button:has-text("新規プロジェクト")')
    await page.setInputFiles('input[type="file"]', 'tests/fixtures/test-audio-short.mp3')
    await page.click('button:has-text("文字起こし開始")')

    // エラーメッセージ表示
    await expect(page.locator('[role="alert"]')).toHaveTextContent(/エラーが発生/)

    // リトライボタン
    await expect(page.locator('button:has-text("再試行")')).toBeVisible()
  })
})
```

### 4.4 文字起こし結果の編集

#### 4.4.1 Unit Tests

**tests/unit/components/TranscriptEditor.test.tsx**:
```typescript
describe('TranscriptEditor', () => {
  test('should render segments', () => {
    const segments = [
      { id: '1', startTime: 0, endTime: 5, text: 'Segment 1' },
      { id: '2', startTime: 5, endTime: 10, text: 'Segment 2' }
    ]

    const { getAllByRole } = render(<TranscriptEditor segments={segments} />)

    expect(getAllByRole('article')).toHaveLength(2)
  })

  test('should edit segment text', async () => {
    const onEdit = vi.fn()
    const segments = [
      { id: '1', startTime: 0, endTime: 5, text: 'Original text' }
    ]

    const { getByText, getByRole } = render(
      <TranscriptEditor segments={segments} onEditSegment={onEdit} />
    )
    const user = userEvent.setup()

    const segment = getByText('Original text')
    await user.click(segment)

    const input = getByRole('textbox')
    await user.clear(input)
    await user.type(input, 'Edited text')
    await user.keyboard('{Enter}')

    expect(onEdit).toHaveBeenCalledWith('1', 'Edited text')
  })

  test('should display timestamps', () => {
    const segments = [
      { id: '1', startTime: 65.5, endTime: 70.2, text: 'Test' }
    ]

    const { getByText } = render(<TranscriptEditor segments={segments} />)

    expect(getByText('01:05')).toBeInTheDocument()
    expect(getByText('01:10')).toBeInTheDocument()
  })
})
```

#### 4.4.2 Integration Tests

**tests/integration/components/TranscriptEditor.integration.test.tsx**:
```typescript
describe('TranscriptEditor Integration', () => {
  test('should auto-save edits', async () => {
    const { getByText, getByRole } = render(
      <TranscriptEditor transcriptionId="test-id" />
    )
    const user = userEvent.setup()

    const segment = getByText('Original text')
    await user.click(segment)

    const input = getByRole('textbox')
    await user.clear(input)
    await user.type(input, 'New text')
    await user.keyboard('{Enter}')

    // Auto-save indicator
    await waitFor(() => {
      expect(getByText(/保存しました/i)).toBeInTheDocument()
    })

    // Verify database update
    const updated = await transcriptionService.getSegment('test-id')
    expect(updated.text).toBe('New text')
  })

  test('should merge segments', async () => {
    const { getAllByRole, getByRole } = render(
      <TranscriptEditor transcriptionId="test-id" />
    )
    const user = userEvent.setup()

    const segments = getAllByRole('article')
    await user.click(segments[0])
    await user.keyboard('{Shift>}')
    await user.click(segments[1])
    await user.keyboard('{/Shift}')

    const mergeButton = getByRole('button', { name: /結合/i })
    await user.click(mergeButton)

    await waitFor(() => {
      expect(getAllByRole('article')).toHaveLength(segments.length - 1)
    })
  })

  test('should split segment', async () => {
    const { getByText, getByRole, getAllByRole } = render(
      <TranscriptEditor transcriptionId="test-id" />
    )
    const user = userEvent.setup()

    const segment = getByText('Long text that should be split')
    await user.click(segment)

    const input = getByRole('textbox')
    await user.click(input, { offset: 10 }) // カーソル位置を設定

    const splitButton = getByRole('button', { name: /分割/i })
    await user.click(splitButton)

    const segments = getAllByRole('article')
    expect(segments.length).toBeGreaterThan(1)
  })
})
```

### 4.5 エクスポート機能

#### 4.5.1 Unit Tests

**tests/unit/services/exportService.test.ts**:
```typescript
describe('ExportService', () => {
  describe('exportToJSON', () => {
    test('should export transcription to JSON format', () => {
      const transcription = {
        id: 'test-id',
        projectId: 'project-id',
        content: 'Full transcription text',
        segments: [
          { id: '1', startTime: 0, endTime: 5, text: 'Segment 1' }
        ]
      }

      const json = exportService.exportToJSON(transcription)
      const parsed = JSON.parse(json)

      expect(parsed.transcription.content).toBe('Full transcription text')
      expect(parsed.transcription.segments).toHaveLength(1)
      expect(parsed.metadata).toBeDefined()
    })

    test('should include metadata in export', () => {
      const transcription = {
        id: 'test-id',
        createdAt: new Date('2026-01-03'),
        model: 'whisper-1'
      }

      const json = exportService.exportToJSON(transcription)
      const parsed = JSON.parse(json)

      expect(parsed.metadata.createdAt).toBe('2026-01-03T00:00:00.000Z')
      expect(parsed.metadata.model).toBe('whisper-1')
    })
  })

  describe('exportToMarkdown', () => {
    test('should export transcription to Markdown format', () => {
      const transcription = {
        projectTitle: 'Test Project',
        audioFileName: 'audio.mp3',
        audioDuration: 300,
        segments: [
          { startTime: 0, endTime: 5, text: 'First segment' },
          { startTime: 5, endTime: 10, text: 'Second segment' }
        ]
      }

      const markdown = exportService.exportToMarkdown(transcription)

      expect(markdown).toContain('# Test Project')
      expect(markdown).toContain('audio.mp3')
      expect(markdown).toContain('[00:00:00] First segment')
      expect(markdown).toContain('[00:00:05] Second segment')
    })

    test('should format timestamps correctly', () => {
      const transcription = {
        segments: [
          { startTime: 3665.5, endTime: 3670, text: 'Test' } // 1h 1m 5.5s
        ]
      }

      const markdown = exportService.exportToMarkdown(transcription)

      expect(markdown).toContain('[01:01:05]')
    })
  })
})
```

#### 4.5.2 Integration Tests

**tests/integration/services/export-flow.integration.test.ts**:
```typescript
describe('Export Flow Integration', () => {
  test('should export and save JSON file', async () => {
    const transcription = await transcriptionService.getById('test-id')
    const json = await exportService.exportToJSON(transcription)

    // ファイル保存ダイアログをモック
    const savePath = await exportService.saveFile(json, 'transcription.json')

    expect(savePath).toBeDefined()

    // ファイルが正しく保存されたか確認
    const fileContent = await fs.readFile(savePath, 'utf-8')
    const parsed = JSON.parse(fileContent)
    expect(parsed.transcription.content).toBe(transcription.content)
  })

  test('should export and save Markdown file', async () => {
    const transcription = await transcriptionService.getById('test-id')
    const markdown = await exportService.exportToMarkdown(transcription)

    const savePath = await exportService.saveFile(markdown, 'transcription.md')

    const fileContent = await fs.readFile(savePath, 'utf-8')
    expect(fileContent).toContain('# ' + transcription.projectTitle)
  })
})
```

#### 4.5.3 E2E Tests

**tests/e2e/export-flow.spec.ts**:
```typescript
test.describe('Export Flow E2E', () => {
  test('should export transcription as JSON', async ({ page }) => {
    await page.goto('/projects/test-project')

    // エクスポートボタンをクリック
    await page.click('button:has-text("エクスポート")')

    // JSON形式を選択
    await page.click('button:has-text("JSON")')

    // ダウンロード待機
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.click('button:has-text("保存")')
    ])

    // ファイル名確認
    expect(download.suggestedFilename()).toContain('.json')

    // ダウンロードしたファイルの内容確認
    const path = await download.path()
    const content = await fs.readFile(path, 'utf-8')
    const json = JSON.parse(content)

    expect(json.transcription).toBeDefined()
    expect(json.metadata).toBeDefined()
  })

  test('should export transcription as Markdown', async ({ page }) => {
    await page.goto('/projects/test-project')

    await page.click('button:has-text("エクスポート")')
    await page.click('button:has-text("Markdown")')

    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.click('button:has-text("保存")')
    ])

    expect(download.suggestedFilename()).toContain('.md')

    const path = await download.path()
    const content = await fs.readFile(path, 'utf-8')

    expect(content).toContain('# ')
    expect(content).toMatch(/\[\d{2}:\d{2}:\d{2}\]/)
  })
})
```

---

## 5. Phase 2: 拡張機能テストケース

### 5.1 話者認識

#### 5.1.1 Unit Tests

**tests/unit/services/speakerService.test.ts**:
```typescript
describe('SpeakerService', () => {
  describe('identifySpeakers', () => {
    test('should identify multiple speakers', async () => {
      const segments = [
        { text: 'Hello', speakerLabel: 'SPEAKER_00' },
        { text: 'Hi there', speakerLabel: 'SPEAKER_01' }
      ]

      const speakers = await speakerService.identifySpeakers(segments)

      expect(speakers).toHaveLength(2)
      expect(speakers[0].name).toBe('Speaker 1')
      expect(speakers[1].name).toBe('Speaker 2')
    })
  })

  describe('updateSpeakerName', () => {
    test('should update speaker custom name', async () => {
      const updated = await speakerService.updateSpeakerName('speaker-id', 'John Doe')
      expect(updated.customName).toBe('John Doe')
    })
  })

  describe('assignColorToSpeaker', () => {
    test('should assign unique colors to speakers', () => {
      const speakers = [
        { id: '1', name: 'Speaker 1' },
        { id: '2', name: 'Speaker 2' }
      ]

      const withColors = speakerService.assignColors(speakers)

      expect(withColors[0].color).not.toBe(withColors[1].color)
    })
  })
})
```

#### 5.1.2 E2E Tests

**tests/e2e/speaker-recognition.spec.ts**:
```typescript
test.describe('Speaker Recognition E2E', () => {
  test('should display and edit speaker names', async ({ page }) => {
    await page.goto('/projects/multi-speaker-project')

    // 話者が識別されている
    await expect(page.locator('[data-speaker="1"]')).toBeVisible()
    await expect(page.locator('[data-speaker="2"]')).toBeVisible()

    // 話者名を編集
    await page.click('button:has-text("話者管理")')
    await page.fill('input[name="speaker-1-name"]', 'Alice')
    await page.fill('input[name="speaker-2-name"]', 'Bob')
    await page.click('button:has-text("保存")')

    // 更新された名前が表示される
    await expect(page.locator('text=Alice')).toBeVisible()
    await expect(page.locator('text=Bob')).toBeVisible()
  })
})
```

### 5.2 カスタム辞書

#### 5.2.1 Unit Tests

**tests/unit/services/dictionaryService.test.ts**:
```typescript
describe('DictionaryService', () => {
  describe('addEntry', () => {
    test('should add new dictionary entry', async () => {
      const entry = await dictionaryService.addEntry({
        word: '専門用語',
        reading: 'せんもんようご',
        category: '技術'
      })

      expect(entry.id).toBeDefined()
      expect(entry.word).toBe('専門用語')
    })

    test('should prevent duplicate entries', async () => {
      await dictionaryService.addEntry({ word: 'Test' })

      await expect(dictionaryService.addEntry({ word: 'Test' }))
        .rejects.toThrow('既に登録されています')
    })
  })

  describe('searchEntries', () => {
    test('should search entries by word', async () => {
      const results = await dictionaryService.searchEntries('専門')
      expect(results.length).toBeGreaterThan(0)
      expect(results[0].word).toContain('専門')
    })
  })

  describe('incrementUsageCount', () => {
    test('should track usage frequency', async () => {
      const entry = await dictionaryService.getEntry('entry-id')
      const initialCount = entry.usageCount

      await dictionaryService.incrementUsageCount('entry-id')

      const updated = await dictionaryService.getEntry('entry-id')
      expect(updated.usageCount).toBe(initialCount + 1)
    })
  })
})
```

#### 5.2.2 E2E Tests

**tests/e2e/dictionary-management.spec.ts**:
```typescript
test.describe('Dictionary Management E2E', () => {
  test('should add and use custom dictionary', async ({ page }) => {
    await page.goto('/settings/dictionary')

    // 辞書エントリ追加
    await page.click('button:has-text("新規追加")')
    await page.fill('input[name="word"]', 'API')
    await page.fill('input[name="reading"]', 'エーピーアイ')
    await page.selectOption('select[name="category"]', '技術')
    await page.click('button:has-text("保存")')

    // 追加されたエントリが表示される
    await expect(page.locator('text=API')).toBeVisible()

    // 新規文字起こしで辞書が適用される
    await page.goto('/')
    await page.click('button:has-text("新規プロジェクト")')

    // 辞書を有効化
    await page.check('input[name="use-dictionary"]')

    // 文字起こし実行（辞書が適用される）
  })
})
```

---

## 6. Phase 3: AI機能テストケース

### 6.1 AI要約

#### 6.1.1 Unit Tests

**tests/unit/services/claudeService.test.ts**:
```typescript
describe('ClaudeService', () => {
  describe('generateSummary', () => {
    test('should generate summary from transcription', async () => {
      const transcription = 'Long meeting transcription text...'

      const summary = await claudeService.generateSummary(transcription, 'simple')

      expect(summary).toBeDefined()
      expect(summary.length).toBeLessThan(transcription.length)
    })

    test('should handle different summary types', async () => {
      const transcription = 'Meeting content...'

      const types = ['simple', 'detailed', 'minutes', 'action-items']

      for (const type of types) {
        const summary = await claudeService.generateSummary(transcription, type)
        expect(summary).toBeDefined()
      }
    })

    test('should retry on API errors', async () => {
      vi.mocked(axios.post)
        .mockRejectedValueOnce(new Error('API Error'))
        .mockResolvedValueOnce({ data: { content: [{ text: 'Summary' }] } })

      const summary = await claudeService.generateSummary('Text', 'simple')

      expect(summary).toBe('Summary')
      expect(axios.post).toHaveBeenCalledTimes(2)
    })
  })

  describe('extractActionItems', () => {
    test('should extract action items from text', async () => {
      const transcription = `
        会議では以下の点が決定されました。
        - 田中さんが来週までに報告書を作成する
        - 佐藤さんがクライアントに連絡する
      `

      const actionItems = await claudeService.extractActionItems(transcription)

      expect(actionItems).toHaveLength(2)
      expect(actionItems[0]).toContain('田中')
      expect(actionItems[1]).toContain('佐藤')
    })
  })
})
```

#### 6.1.2 E2E Tests

**tests/e2e/ai-summary.spec.ts**:
```typescript
test.describe('AI Summary E2E', () => {
  test('should generate meeting minutes', async ({ page }) => {
    await page.goto('/projects/meeting-project')

    // AI要約ボタン
    await page.click('button:has-text("AI要約")')

    // 要約タイプ選択
    await page.click('button:has-text("議事録形式")')

    // 生成中
    await expect(page.locator('text=生成中')).toBeVisible()

    // 完了を待つ
    await page.waitForSelector('[data-testid="summary-content"]', { timeout: 60000 })

    // 要約が表示される
    const summaryContent = await page.locator('[data-testid="summary-content"]').textContent()
    expect(summaryContent).toContain('会議概要')
    expect(summaryContent).toContain('決定事項')
  })

  test('should regenerate summary with different type', async ({ page }) => {
    await page.goto('/projects/meeting-project')

    // 最初の要約
    await page.click('button:has-text("AI要約")')
    await page.click('button:has-text("簡易要約")')
    await page.waitForSelector('[data-testid="summary-content"]')

    const firstSummary = await page.locator('[data-testid="summary-content"]').textContent()

    // 別のタイプで再生成
    await page.click('button:has-text("再生成")')
    await page.click('button:has-text("詳細要約")')
    await page.waitForSelector('[data-testid="summary-content"]')

    const secondSummary = await page.locator('[data-testid="summary-content"]').textContent()

    expect(firstSummary).not.toBe(secondSummary)
  })
})
```

### 6.2 音声再生

#### 6.2.1 Unit Tests

**tests/unit/components/AudioPlayer.test.tsx**:
```typescript
describe('AudioPlayer', () => {
  test('should play and pause audio', async () => {
    const { getByRole } = render(<AudioPlayer src="/audio/test.mp3" />)
    const user = userEvent.setup()

    const playButton = getByRole('button', { name: /再生/i })
    await user.click(playButton)

    expect(getByRole('button', { name: /一時停止/i })).toBeInTheDocument()
  })

  test('should adjust playback speed', async () => {
    const { getByRole, getByLabelText } = render(<AudioPlayer src="/audio/test.mp3" />)
    const user = userEvent.setup()

    const speedSlider = getByLabelText(/再生速度/i)
    await user.click(speedSlider)

    const speed2x = getByRole('menuitem', { name: '2x' })
    await user.click(speed2x)

    expect(getByRole('button', { name: /2x/i })).toBeInTheDocument()
  })

  test('should seek to timestamp', async () => {
    const onSeek = vi.fn()
    const { getByRole } = render(
      <AudioPlayer src="/audio/test.mp3" onSeek={onSeek} />
    )
    const user = userEvent.setup()

    const seekBar = getByRole('slider')
    await user.click(seekBar, { offset: 100 })

    expect(onSeek).toHaveBeenCalled()
  })
})
```

#### 6.2.2 E2E Tests

**tests/e2e/audio-playback.spec.ts**:
```typescript
test.describe('Audio Playback E2E', () => {
  test('should play audio from timestamp', async ({ page }) => {
    await page.goto('/projects/test-project')

    // タイムスタンプをクリック
    await page.click('[data-timestamp="30.0"]')

    // オーディオプレイヤーが30秒位置から再生
    const currentTime = await page.evaluate(() => {
      const audio = document.querySelector('audio')
      return audio?.currentTime
    })

    expect(currentTime).toBeCloseTo(30.0, 1)
  })

  test('should sync playback with transcript', async ({ page }) => {
    await page.goto('/projects/test-project')

    // 再生開始
    await page.click('button[aria-label="再生"]')

    // 再生中のセグメントがハイライトされる
    await page.waitForSelector('[data-active-segment="true"]')

    const activeSegment = await page.locator('[data-active-segment="true"]').textContent()
    expect(activeSegment).toBeDefined()
  })
})
```

---

## 7. パフォーマンステスト

### 7.1 大量データ処理

**tests/performance/large-transcription.test.ts**:
```typescript
describe('Large Transcription Performance', () => {
  test('should handle 4-hour audio efficiently', async () => {
    const startTime = performance.now()

    const result = await whisperService.transcribeLongAudio('/fixtures/audio-4hours.mp3')

    const endTime = performance.now()
    const processingTime = (endTime - startTime) / 1000 / 60 // minutes

    expect(processingTime).toBeLessThan(60) // 1時間以内
    expect(result.segments.length).toBeGreaterThan(100)
  })

  test('should render 1000 segments without lag', async () => {
    const segments = Array.from({ length: 1000 }, (_, i) => ({
      id: `${i}`,
      startTime: i * 5,
      endTime: (i + 1) * 5,
      text: `Segment ${i}`
    }))

    const startTime = performance.now()

    const { getAllByRole } = render(<TranscriptEditor segments={segments} />)

    const endTime = performance.now()
    const renderTime = endTime - startTime

    expect(renderTime).toBeLessThan(1000) // 1秒以内
    expect(getAllByRole('article')).toHaveLength(1000)
  })
})
```

### 7.2 データベースクエリ

**tests/performance/database-queries.test.ts**:
```typescript
describe('Database Query Performance', () => {
  beforeAll(async () => {
    // 100プロジェクトを作成
    for (let i = 0; i < 100; i++) {
      await projectService.createProject({
        title: `Project ${i}`,
        audioFilePath: `/path/to/audio-${i}.mp3`
      })
    }
  })

  test('should search projects quickly', async () => {
    const startTime = performance.now()

    const results = await projectService.searchProjects('Project 5')

    const endTime = performance.now()
    const queryTime = endTime - startTime

    expect(queryTime).toBeLessThan(100) // 100ms以内
    expect(results.length).toBeGreaterThan(0)
  })

  test('should load project list with pagination', async () => {
    const startTime = performance.now()

    const projects = await projectService.getProjects({ page: 1, limit: 20 })

    const endTime = performance.now()
    const queryTime = endTime - startTime

    expect(queryTime).toBeLessThan(50) // 50ms以内
    expect(projects.length).toBe(20)
  })
})
```

---

## 8. セキュリティテスト

### 8.1 APIキー管理

**tests/security/api-key-security.test.ts**:
```typescript
describe('API Key Security', () => {
  test('should not expose API keys in logs', async () => {
    const consoleLog = vi.spyOn(console, 'log')

    await whisperService.transcribeAudio('/path/to/audio.mp3')

    const logs = consoleLog.mock.calls.flat().join(' ')
    expect(logs).not.toContain(process.env.OPENAI_API_KEY)
  })

  test('should not include API keys in error messages', async () => {
    vi.mocked(axios.post).mockRejectedValue(new Error('API Error'))

    try {
      await whisperService.transcribeAudio('/path/to/audio.mp3')
    } catch (error) {
      expect(error.message).not.toContain(process.env.OPENAI_API_KEY)
    }
  })

  test('should store API keys securely', () => {
    // OS KeychainまたはSecure Storageを使用
    const apiKey = settingsService.getAPIKey('openai')
    expect(apiKey).toBeDefined()

    // プレーンテキストで保存されていないことを確認
    const settingsFile = fs.readFileSync('.env', 'utf-8')
    expect(settingsFile).not.toContain('sk-')
  })
})
```

### 8.2 ファイルアクセス制御

**tests/security/file-access.test.ts**:
```typescript
describe('File Access Security', () => {
  test('should prevent path traversal attacks', async () => {
    const maliciousPath = '../../../etc/passwd'

    await expect(fileService.readFile(maliciousPath))
      .rejects.toThrow('不正なファイルパス')
  })

  test('should restrict file access to app directory', async () => {
    const outsidePath = '/etc/hosts'

    await expect(fileService.readFile(outsidePath))
      .rejects.toThrow('アクセス権限がありません')
  })

  test('should validate file types before processing', async () => {
    const executableFile = '/path/to/malicious.exe'

    await expect(fileService.validateAudioFile(executableFile))
      .rejects.toThrow('不正なファイル形式')
  })
})
```

### 8.3 SQLインジェクション対策

**tests/security/sql-injection.test.ts**:
```typescript
describe('SQL Injection Prevention', () => {
  test('should prevent SQL injection in search', async () => {
    const maliciousInput = "'; DROP TABLE projects; --"

    // エラーにならず、安全に処理される
    const results = await projectService.searchProjects(maliciousInput)

    expect(results).toEqual([])

    // テーブルが削除されていないことを確認
    const allProjects = await projectService.getProjects()
    expect(allProjects.length).toBeGreaterThan(0)
  })

  test('should use prepared statements', async () => {
    const spy = vi.spyOn(db, 'prepare')

    await projectService.getProjectById('test-id')

    expect(spy).toHaveBeenCalled()
  })
})
```

---

## 9. テストデータ

### 9.1 Fixtures

**tests/fixtures/audio-files/**:
```
tests/fixtures/
├── test-audio-short.mp3      # 30秒の短い音声
├── test-audio-medium.mp3     # 10分の音声
├── test-audio-long.mp3       # 1時間の音声
├── test-audio-4hours.mp3     # 4時間の音声（大容量テスト用）
├── test-audio-multi-speaker.mp3  # 複数話者の音声
└── test-audio-technical.mp3  # 専門用語を含む音声
```

### 9.2 Mock データ

**tests/mocks/transcription-data.ts**:
```typescript
export const mockTranscription = {
  id: 'mock-transcription-id',
  projectId: 'mock-project-id',
  content: 'これはテストの文字起こしです。',
  language: 'ja',
  createdAt: new Date('2026-01-03'),
  segments: [
    {
      id: 'segment-1',
      transcriptionId: 'mock-transcription-id',
      startTime: 0.0,
      endTime: 2.5,
      text: 'これはテストの',
      confidence: 0.95,
      sequenceNumber: 1
    },
    {
      id: 'segment-2',
      transcriptionId: 'mock-transcription-id',
      startTime: 2.5,
      endTime: 5.0,
      text: '文字起こしです。',
      confidence: 0.92,
      sequenceNumber: 2
    }
  ]
}

export const mockProject = {
  id: 'mock-project-id',
  title: 'テストプロジェクト',
  status: 'completed',
  audioFilePath: '/path/to/test-audio.mp3',
  audioFileName: 'test-audio.mp3',
  audioFileSize: 1024000,
  audioDuration: 300.5,
  createdAt: new Date('2026-01-03')
}
```

**tests/mocks/api-handlers.ts**:
```typescript
import { http, HttpResponse } from 'msw'

export const handlers = [
  // Whisper API Mock
  http.post('https://api.openai.com/v1/audio/transcriptions', () => {
    return HttpResponse.json({
      text: 'これはモックの文字起こし結果です。',
      segments: [
        { id: 0, start: 0.0, end: 2.5, text: 'これはモックの文字起こし結果です。' }
      ]
    })
  }),

  // Claude API Mock
  http.post('https://api.anthropic.com/v1/messages', () => {
    return HttpResponse.json({
      content: [
        {
          type: 'text',
          text: '## 会議概要\n- テスト会議\n\n## 決定事項\n- テスト決定'
        }
      ]
    })
  }),

  // エラーシミュレーション
  http.post('https://api.openai.com/v1/audio/transcriptions', ({ request }) => {
    const url = new URL(request.url)
    if (url.searchParams.get('simulate-error') === 'true') {
      return new HttpResponse(null, { status: 500 })
    }
  })
]
```

### 9.3 Database Seed

**tests/seeds/database-seed.ts**:
```typescript
export async function seedDatabase() {
  // Projects
  const projects = [
    {
      id: 'project-1',
      title: '週次ミーティング',
      status: 'completed',
      audioFilePath: '/path/to/weekly-meeting.mp3',
      audioFileName: 'weekly-meeting.mp3',
      audioDuration: 1800
    },
    {
      id: 'project-2',
      title: 'インタビュー録音',
      status: 'processing',
      audioFilePath: '/path/to/interview.mp3',
      audioFileName: 'interview.mp3',
      audioDuration: 3600
    }
  ]

  for (const project of projects) {
    await projectService.createProject(project)
  }

  // Transcriptions
  const transcription = {
    projectId: 'project-1',
    content: '今週の進捗について報告します。',
    segments: [
      { startTime: 0, endTime: 5, text: '今週の進捗について報告します。' }
    ]
  }

  await transcriptionService.saveTranscription(transcription)

  // Dictionary
  const dictionaryEntries = [
    { word: 'API', reading: 'エーピーアイ', category: '技術' },
    { word: 'UI', reading: 'ユーアイ', category: '技術' }
  ]

  for (const entry of dictionaryEntries) {
    await dictionaryService.addEntry(entry)
  }
}
```

---

## 10. CI/CD統合

### 10.1 GitHub Actions ワークフロー

**.github/workflows/test.yml**:
```yaml
name: Test

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

jobs:
  unit-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '18'
      - run: npm install
      - run: npm run test:unit -- --coverage
      - uses: codecov/codecov-action@v3
        with:
          files: ./coverage/coverage-final.json

  integration-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: npm install
      - run: npm run test:integration

  e2e-test:
    runs-on: ${{ matrix.os }}
    strategy:
      matrix:
        os: [ubuntu-latest, windows-latest, macos-latest]
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: npm install
      - run: npx playwright install --with-deps
      - run: npm run test:e2e
      - uses: actions/upload-artifact@v3
        if: failure()
        with:
          name: playwright-screenshots
          path: tests/e2e/screenshots/

  performance-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: npm install
      - run: npm run test:performance
      - name: Performance Report
        run: |
          echo "## Performance Test Results" >> $GITHUB_STEP_SUMMARY
          cat tests/performance/results.md >> $GITHUB_STEP_SUMMARY
```

### 10.2 テストコマンド

**package.json**:
```json
{
  "scripts": {
    "test": "vitest",
    "test:unit": "vitest run tests/unit",
    "test:integration": "vitest run tests/integration",
    "test:e2e": "playwright test",
    "test:e2e:headed": "playwright test --headed",
    "test:performance": "vitest run tests/performance",
    "test:security": "vitest run tests/security",
    "test:coverage": "vitest run --coverage",
    "test:ui": "vitest --ui",
    "test:watch": "vitest watch"
  }
}
```

### 10.3 カバレッジレポート

**vitest.config.ts** (coverage設定):
```typescript
export default defineConfig({
  test: {
    coverage: {
      provider: 'c8',
      reporter: ['text', 'json', 'html', 'lcov'],
      exclude: [
        'node_modules/',
        'tests/',
        '**/*.test.ts',
        '**/*.spec.ts',
        '**/types/',
        '**/*.d.ts'
      ],
      lines: 80,
      functions: 80,
      branches: 75,
      statements: 80
    }
  }
})
```

---

## 11. テスト実行戦略

### 11.1 開発時

```bash
# ウォッチモード（開発中）
npm run test:watch

# UIモード（デバッグ）
npm run test:ui

# 特定のファイルのみ
npm run test:unit -- fileValidator.test.ts
```

### 11.2 コミット前

```bash
# Huskyフックで自動実行
# .husky/pre-commit
npm run test:unit
npm run test:integration
```

### 11.3 CI/CD

```bash
# 全テスト実行
npm run test:coverage
npm run test:e2e
npm run test:security
```

---

## 12. テストベストプラクティス

### 12.1 命名規則

```typescript
// ✅ Good
describe('ProjectService', () => {
  describe('createProject', () => {
    test('should create a new project with valid data', () => {})
    test('should throw error if required fields are missing', () => {})
  })
})

// ❌ Bad
describe('test', () => {
  test('test1', () => {})
})
```

### 12.2 Arrange-Act-Assert パターン

```typescript
test('should update project status', async () => {
  // Arrange
  const project = await projectService.createProject({ title: 'Test' })

  // Act
  const updated = await projectService.updateProjectStatus(project.id, 'completed')

  // Assert
  expect(updated.status).toBe('completed')
})
```

### 12.3 Mock の使用

```typescript
// ✅ Good: 外部依存をモック
test('should call Whisper API', async () => {
  vi.mocked(axios.post).mockResolvedValue({ data: { text: 'result' } })

  await whisperService.transcribeAudio('/path/to/audio.mp3')

  expect(axios.post).toHaveBeenCalledWith(
    expect.stringContaining('whisper'),
    expect.any(FormData)
  )
})

// ❌ Bad: 実際のAPIを呼び出す（遅い、不安定、コストがかかる）
test('should call Whisper API', async () => {
  const result = await whisperService.transcribeAudio('/real/audio.mp3')
  expect(result).toBeDefined()
})
```

### 12.4 テストの独立性

```typescript
// ✅ Good: 各テストが独立
beforeEach(() => {
  db.exec('DELETE FROM projects')
})

test('should create project', async () => {
  const project = await projectService.createProject({ title: 'Test' })
  expect(project).toBeDefined()
})

// ❌ Bad: テストが依存関係を持つ
test('should create project', async () => {
  const project = await projectService.createProject({ title: 'Test' })
  globalProjectId = project.id // 他のテストに影響
})

test('should get project', async () => {
  const project = await projectService.getProjectById(globalProjectId)
  expect(project).toBeDefined()
})
```

---

## 13. メンテナンス

### 13.1 定期的なレビュー

- **月次**: テストカバレッジレポート確認
- **四半期**: テストスイート全体の見直し
- **新機能追加時**: 対応するテストケース追加

### 13.2 テストデータ更新

- Fixtureの定期的な更新
- Mockデータの実データとの整合性確認
- 古いテストケースの削除

### 13.3 パフォーマンス最適化

- 遅いテストの特定と最適化
- 並列実行の活用
- 不要なセットアップの削減

---

**最終更新**: 2026-01-03
**バージョン**: 1.0
