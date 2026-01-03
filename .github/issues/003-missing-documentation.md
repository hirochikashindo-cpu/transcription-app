# [P0] 欠落設計ドキュメントの作成

## 問題の説明

以下の重要な設計ドキュメントが欠落しています：

1. **ER.md**: データモデルの詳細設計書
2. **screen.md**: 画面設計書
3. **api.md**: IPC API仕様書
4. **test.md**: テスト仕様書

現在、これらの情報はClaude.mdに部分的に含まれていますが、詳細が不足しています。

### 影響範囲

- 開発者が参照すべき詳細仕様がない
- 画面設計の具体的なレイアウト、コンポーネント階層が不明
- IPC APIの詳細仕様（リクエスト/レスポンス形式、エラーハンドリング）が不明確
- テストケースの具体的な内容が不明

## 期待される結果

以下のドキュメントを作成、またはClaude.mdに統合：

1. データモデルの詳細（ER図、リレーション、制約）
2. 全画面の詳細設計（ワイヤーフレーム、コンポーネント仕様）
3. IPC API完全仕様（全エンドポイント、型定義、エラーハンドリング）
4. テストケース一覧（単体、統合、E2E）

## 実装提案

### オプション1: 個別ドキュメントとして作成（推奨）

各ドキュメントを独立したファイルとして管理:
- `docs/ER.md`
- `docs/screen.md`
- `docs/api.md`
- `docs/test.md`

**メリット**:
- 各ドキュメントが独立して管理しやすい
- 専門性に応じて担当を分けやすい
- 更新時の影響範囲が明確

### オプション2: Claude.mdに統合

Claude.mdの各セクションを拡充:
- セクション6: データベーススキーマ → ER図追加
- 新セクション14: 画面設計
- 新セクション15: API仕様
- セクション9と統合: テスト仕様

**メリット**:
- 単一ドキュメントで全体把握が容易
- 検索性が高い

### 推奨アプローチ: ハイブリッド

1. **詳細仕様は個別ファイル**として作成
2. **Claude.mdには概要とリンク**を記載

## 各ドキュメントの必須内容

### 1. ER.md

```markdown
# データモデル設計書

## ER図

\`\`\`mermaid
erDiagram
    projects ||--o{ transcriptions : has
    transcriptions ||--o{ segments : contains
    projects ||--o{ speakers : has
    segments }o--|| speakers : spoken_by
\`\`\`

## テーブル詳細

### projects
- **主キー**: id (UUID)
- **外部キー**: なし
- **インデックス**: status, created_at
- **制約**: title NOT NULL, audio_file_path NOT NULL
- **トリガー**: updated_at自動更新

[各テーブルの詳細...]
```

### 2. screen.md

```markdown
# 画面設計書

## 画面一覧

1. ダッシュボード (/)
2. プロジェクト詳細 (/project/:id)
3. 文字起こしエディタ (/project/:id/edit)
4. 設定画面 (/settings)

## 各画面の詳細

### ダッシュボード

**URL**: /
**レイアウト**: グリッドレイアウト

**コンポーネント階層**:
\`\`\`
Dashboard
├─ Header
│  ├─ AppTitle
│  └─ NewProjectButton
├─ SearchBar
├─ FilterPanel
└─ ProjectGrid
   └─ ProjectCard[] (複数)
      ├─ ProjectThumbnail
      ├─ ProjectInfo
      └─ ActionButtons
\`\`\`

**状態管理**:
- projectStore: プロジェクト一覧
- filterStore: フィルター条件

[各画面の詳細...]
```

### 3. api.md

```markdown
# IPC API仕様書

## 概要

Renderer ProcessとMain Process間のIPC通信API仕様。

## API一覧

### Project APIs

#### project:create

**説明**: 新しいプロジェクトを作成

**リクエスト**:
\`\`\`typescript
interface CreateProjectRequest {
  title: string
  description?: string
  audio_file_path: string
  audio_file_name: string
  audio_file_size?: number
  audio_duration?: number
  audio_format?: string
}
\`\`\`

**レスポンス**:
\`\`\`typescript
interface CreateProjectResponse {
  id: string
  title: string
  created_at: Date
  // ... Project型の全フィールド
}
\`\`\`

**エラー**:
- `INVALID_FILE_PATH`: ファイルパスが無効
- `FILE_NOT_FOUND`: ファイルが見つからない
- `DATABASE_ERROR`: DB操作エラー

[各APIの詳細...]
```

### 4. test.md

```markdown
# テスト仕様書

## テスト戦略

- **Unit Test**: 80%カバレッジ目標（Phase 1では70%）
- **Integration Test**: 主要フロー網羅
- **E2E Test**: ユーザーシナリオベース

## テストケース一覧

### Unit Tests

#### DatabaseService

\`\`\`typescript
describe('DatabaseService', () => {
  test('should initialize database', () => {
    // ...
  })

  test('should run migrations in order', () => {
    // ...
  })

  test('should handle migration errors', () => {
    // ...
  })
})
\`\`\`

[各テストの詳細...]
```

## 受け入れ基準

- [ ] ER.mdが作成され、全テーブルの詳細が記載されている
- [ ] ER図（Mermaid形式）が含まれている
- [ ] screen.mdが作成され、全画面の詳細設計が記載されている
- [ ] 各画面のコンポーネント階層図が含まれている
- [ ] api.mdが作成され、全IPC APIの仕様が記載されている
- [ ] 各APIのリクエスト/レスポンス型、エラーケースが定義されている
- [ ] test.mdが作成され、テスト戦略とケース一覧が記載されている
- [ ] Claude.mdから各ドキュメントへのリンクが張られている

## ラベル

`priority:p0`, `type:documentation`, `phase:1`

## マイルストーン

Phase 1 - MVP
