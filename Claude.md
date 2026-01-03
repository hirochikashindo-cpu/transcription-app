# Transcription App - 要件定義書

作成日: 2026-01-03

## 1. プロジェクト概要

### 1.1 目的
音声ファイルの文字起こし、編集、議事録・イベントサマリ作成を行うデスクトップアプリケーション

### 1.2 背景
- 4時間以上の長時間音声にも対応
- 専門用語を含む音声の高精度な文字起こし
- 対談・会議などの複数話者の音声処理
- カスタム辞書による認識精度の向上

### 1.3 ユーザー
- 個人利用を想定（認証機能なし）
- ローカル環境でのデータ管理

---

## 2. 技術スタック

### 2.1 アプリケーション形式
- **フェーズ1**: Electronデスクトップアプリ（Windows/Mac/Linux）
- **フェーズ2以降**: React Nativeモバイルアプリへの展開を視野

### 2.2 フロントエンド
- **フレームワーク**: React 18
- **言語**: TypeScript 5+
- **ビルドツール**: Vite
- **状態管理**: Zustand
- **スタイリング**: CSS Modules + CSS Variables

### 2.3 バックエンド (Electron Main Process)
- **ランタイム**: Node.js
- **フレームワーク**: Electron
- **言語**: TypeScript
- **データベース**: SQLite (better-sqlite3)
- **音声処理**: fluent-ffmpeg
- **HTTP Client**: axios

### 2.4 外部API
- **文字起こし**: OpenAI Whisper API
- **AI要約 (Phase 3)**: Anthropic Claude API

### 2.5 開発ツール
- **Linter**: ESLint
- **Formatter**: Prettier
- **テスト**: Vitest (Unit), Playwright (E2E)
- **パッケージマネージャー**: npm / pnpm

---

## 3. 機能要件

### 3.1 フェーズ1: MVP（最小機能製品）

#### 3.1.1 基本的な文字起こし機能
**必須要件**:
- ファイル選択ダイアログから音声ファイルをアップロード
- 対応形式: MP3, WAV, M4A など一般的な形式
- 4時間以上の音声は自動分割処理（Whisper API 25MB制限対応）
- 処理進捗状況のリアルタイム表示
- バックグラウンド処理

**入力**:
- 音声ファイル（ローカルファイルシステムから選択）

**出力**:
- タイムスタンプ付き文字起こしテキスト
- セグメント化されたデータ（開始時間、終了時間、テキスト）

**制約**:
- Whisper API制限: 25MB/ファイル → 自動分割処理で対応
- 処理時間: 音声長に依存（目安: 1時間の音声で5-10分）

#### 3.1.2 文字起こし結果の編集機能
**必須要件**:
- テキスト編集エディタ
- タイムスタンプ表示
- セグメント単位での編集
- 編集内容の自動保存

**UI要件**:
- セグメントごとの表示
- インライン編集
- タイムスタンプのクリック（将来的に音声再生位置へジャンプ）

#### 3.1.3 エクスポート機能
**対応形式**:

1. **JSON形式**
   - メタデータ含む完全なデータ
   - 再インポート可能
   ```json
   {
     "projectId": "uuid",
     "title": "プロジェクト名",
     "audioFile": "ファイル名",
     "duration": 3600,
     "transcription": {
       "segments": [
         {
           "id": "uuid",
           "startTime": 0.0,
           "endTime": 5.2,
           "text": "テキスト内容",
           "speakerId": null,
           "confidence": 0.95
         }
       ]
     },
     "metadata": {
       "createdAt": "2026-01-03T10:00:00Z",
       "model": "whisper-1",
       "language": "ja"
     }
   }
   ```

2. **Markdown形式**
   - 読みやすい議事録形式
   - 書式設定可能
   ```markdown
   # プロジェクト名

   ## 基本情報
   - 音声ファイル: example.mp3
   - 長さ: 1時間00分
   - 作成日: 2026-01-03

   ## 文字起こし

   [00:00:00] テキスト内容...
   [00:00:05] 続きのテキスト...
   ```

#### 3.1.4 プロジェクト管理
**必須要件**:
- プロジェクト一覧表示
- プロジェクトの作成・削除
- 検索・フィルタリング
- ソート機能（作成日、更新日、タイトル）

**表示情報**:
- プロジェクト名
- 作成日時
- 更新日時
- ステータス（処理中、完了、エラー）
- 音声ファイル情報（ファイル名、長さ）

### 3.2 フェーズ2: 拡張機能

#### 3.2.1 話者認識・分離機能
**必須要件**:
- 複数話者の自動識別
- 話者ごとに色分け表示
- 話者名の編集・カスタマイズ
- 話者ごとのフィルタリング

**技術要件**:
- Whisper APIの話者認識機能を使用
- または別途話者分離モデルの導入検討

**データモデル**:
```typescript
interface Speaker {
  id: string
  name: string        // "Speaker 1", "Speaker 2"
  customName?: string // ユーザーが編集可能
  color: string       // UI表示用カラーコード
}
```

#### 3.2.2 カスタム辞書管理
**必須要件**:
- 専門用語・固有名詞の登録
- 読み仮名の設定
- カテゴリ分類（専門用語、固有名詞、略語など）
- 辞書のインポート/エクスポート
- 使用頻度の記録

**機能**:
- 辞書エディタUI
- 辞書の有効/無効切り替え
- 複数辞書の管理
- CSV形式でのインポート/エクスポート

**データモデル**:
```typescript
interface DictionaryEntry {
  id: string
  word: string        // 単語
  reading?: string    // 読み仮名
  category: string    // カテゴリ
  usageCount: number  // 使用回数
  createdAt: Date
  updatedAt: Date
}
```

### 3.3 フェーズ3: AI機能強化

#### 3.3.1 AI要約・議事録生成
**必須要件**:
- Claude APIを使用した自動要約
- 議事録フォーマット生成
- 要点抽出
- アクションアイテムの抽出

**要約タイプ**:
1. **簡易要約**: 3-5箇条書き
2. **詳細要約**: セクションごとの要約
3. **議事録形式**: 正式な議事録フォーマット
4. **アクションアイテム**: TODO抽出

**プロンプト例**:
```
以下は会議の文字起こしです。以下の形式で議事録を作成してください：

## 会議概要
## 主な議論内容
## 決定事項
## アクションアイテム
## 次回までの課題

[文字起こしテキスト]
```

#### 3.3.2 音声再生機能
**必須要件**:
- アプリ内音声プレイヤー
- タイムスタンプクリックで該当位置から再生
- 再生速度調整（0.5x, 0.75x, 1x, 1.25x, 1.5x, 2x）
- シーク機能
- 波形表示（オプション）

**UI要件**:
- 再生/一時停止ボタン
- シークバー
- 現在時刻表示
- 速度調整スライダー

---

## 4. 非機能要件

### 4.1 パフォーマンス
- **4時間以上の音声処理**: 自動分割により対応
- **UI応答性**: 処理中もUIがフリーズしない
- **データベース検索**: 100プロジェクトでも高速検索（インデックス活用）

### 4.2 セキュリティ
- **API Key管理**: 環境変数またはOSキーチェーンに保存
- **ファイルアクセス**: サンドボックス内での安全な操作
- **SQLインジェクション対策**: プリペアドステートメント使用
- **XSS対策**: Reactの自動エスケープ

### 4.3 プライバシー
- **ローカルストレージのみ**: 音声・文字起こしデータは外部送信しない
- **API送信**: Whisper/Claude APIへの送信は必要最小限

### 4.4 拡張性
- **React Nativeへの移行**: コードの共有可能な設計
- **プラグインシステム**: 将来的な機能拡張に対応
- **カスタムエクスポーター**: 新しい出力形式の追加が容易

### 4.5 ユーザビリティ
- **直感的なUI**: ドラッグ&ドロップ、ファイル選択
- **進捗表示**: リアルタイムの処理状況
- **エラーメッセージ**: わかりやすいエラー表示と解決策の提示

---

## 5. システムアーキテクチャ

### 5.1 全体構成

```
┌─────────────────────────────────────────────────────────────┐
│                    Electronデスクトップアプリ                 │
│                                                               │
│  ┌────────────────────────────────────────────────────┐     │
│  │         Renderer Process (React/TypeScript)         │     │
│  │  - Pages (Dashboard, Transcript, Settings)          │     │
│  │  - Components (FileUpload, Editor, Progress)        │     │
│  │  - State Management (Zustand)                       │     │
│  └────────────────────┬───────────────────────────────┘     │
│                       │ IPC通信                              │
│  ┌────────────────────┴───────────────────────────────┐     │
│  │         Main Process (Node.js/TypeScript)           │     │
│  │  - WhisperService (API呼び出し)                     │     │
│  │  - DatabaseService (SQLite操作)                     │     │
│  │  - FileHandler (ファイル操作)                       │     │
│  │  - ExportService (エクスポート)                     │     │
│  └────────┬────────────┬────────────┬─────────────────┘     │
└───────────┼────────────┼────────────┼───────────────────────┘
            │            │            │
            ▼            ▼            ▼
    ┌──────────┐  ┌──────────┐  ┌──────────┐
    │ File     │  │ Whisper  │  │ SQLite   │
    │ System   │  │   API    │  │ Database │
    └──────────┘  └──────────┘  └──────────┘
```

### 5.2 レイヤー構成

**Presentation Layer**:
- Pages/Views
- UI Components
- Custom Hooks

**State Management Layer**:
- Zustand Stores
  - projectStore
  - transcriptionStore
  - settingsStore

**Service Layer**:
- IPC Service (Renderer ⇄ Main)
- File Service
- Export Service

**Main Process Layer**:
- File Handler
- Whisper Service
- Database Service

**Data Access Layer**:
- File System
- Whisper API
- SQLite

---

## 6. データベーススキーマ

### 6.1 主要テーブル

#### projects テーブル
```sql
CREATE TABLE projects (
  id TEXT PRIMARY KEY,                    -- UUID
  title TEXT NOT NULL,
  description TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  status TEXT DEFAULT 'pending',          -- pending, processing, completed, failed
  audio_file_path TEXT NOT NULL,
  audio_file_name TEXT NOT NULL,
  audio_file_size INTEGER,
  audio_duration REAL,                    -- 秒
  audio_format TEXT                       -- mp3, wav, m4a等
);
```

#### transcriptions テーブル
```sql
CREATE TABLE transcriptions (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  content TEXT NOT NULL,                  -- 全文
  language TEXT DEFAULT 'ja',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);
```

#### segments テーブル
```sql
CREATE TABLE segments (
  id TEXT PRIMARY KEY,
  transcription_id TEXT NOT NULL,
  start_time REAL NOT NULL,               -- 秒
  end_time REAL NOT NULL,
  text TEXT NOT NULL,
  speaker_id TEXT,                        -- Phase 2
  confidence REAL,                        -- 信頼度スコア
  sequence_number INTEGER NOT NULL,
  FOREIGN KEY (transcription_id) REFERENCES transcriptions(id) ON DELETE CASCADE
);
```

#### speakers テーブル (Phase 2)
```sql
CREATE TABLE speakers (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  name TEXT NOT NULL,                     -- Speaker 1, Speaker 2
  custom_name TEXT,                       -- ユーザー編集可能
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);
```

#### custom_dictionaries テーブル (Phase 2)
```sql
CREATE TABLE custom_dictionaries (
  id TEXT PRIMARY KEY,
  word TEXT NOT NULL UNIQUE,
  reading TEXT,
  category TEXT,
  usage_count INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

#### summaries テーブル (Phase 3)
```sql
CREATE TABLE summaries (
  id TEXT PRIMARY KEY,
  transcription_id TEXT NOT NULL,
  summary_type TEXT NOT NULL,             -- minutes, event_summary
  content TEXT NOT NULL,
  model TEXT,                             -- claude-3-opus等
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (transcription_id) REFERENCES transcriptions(id) ON DELETE CASCADE
);
```

#### settings テーブル
```sql
CREATE TABLE settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

---

## 7. データフロー

### 7.1 文字起こし処理フロー

1. **ファイル選択**: ユーザーがファイル選択ダイアログから音声ファイルを選択
2. **ファイル検証**: サイズ、形式、破損チェック
3. **プロジェクト作成**: データベースに新規プロジェクトレコード作成
4. **ファイル分割判定**: 25MB超過の場合は自動分割
5. **Whisper API呼び出し**: 分割ファイルごとに並列処理
6. **結果マージ**: 分割した結果を統合
7. **データベース保存**: transcriptions, segments テーブルに保存
8. **進捗通知**: IPC経由でフロントエンドに進捗を通知
9. **完了通知**: UI更新、ユーザーに完了を通知

### 7.2 エクスポート処理フロー

1. **エクスポート実行**: ユーザーがエクスポートボタンをクリック
2. **データ取得**: データベースから文字起こしデータを取得
3. **フォーマット変換**: JSON または Markdown形式に変換
4. **保存ダイアログ**: ユーザーが保存先を選択
5. **ファイル書き込み**: 指定された場所に保存
6. **完了通知**: 保存完了をユーザーに通知

---

## 8. エラーハンドリング

### 8.1 エラー分類

**FileValidationError**:
- 不正なファイル形式
- ファイルサイズ超過
- ファイル破損

**TranscriptionError**:
- API呼び出し失敗
- タイムアウト
- レート制限

**DatabaseError**:
- 接続失敗
- クエリエラー
- マイグレーション失敗

### 8.2 エラーハンドリング戦略

**リトライロジック**:
- API呼び出しエラー: 3回まで指数バックオフでリトライ
- タイムアウト: 60秒

**ユーザー通知**:
- トースト通知でエラー内容を表示
- エラーログの記録
- 復旧手順の提示

**フォールバック**:
- 一時ディレクトリの使用
- バックアップからの復元

---

## 9. 開発ロードマップ

### Phase 1: MVP (目標: 4-6週間)
- [x] 要件定義
- [x] アーキテクチャ設計
- [x] プロジェクト構成
- [ ] データベースサービス実装
- [ ] 基本UI実装
- [ ] Whisper API連携
- [ ] エクスポート機能
- [ ] テスト・バグ修正

### Phase 2: 拡張機能 (目標: 3-4週間)
- [ ] 話者認識機能
- [ ] カスタム辞書管理
- [ ] 辞書適用ロジック
- [ ] UI改善

### Phase 3: AI機能強化 (目標: 2-3週間)
- [ ] Claude API連携
- [ ] 要約機能
- [ ] 議事録生成
- [ ] 音声再生機能

### Phase 4: モバイル対応 (目標: TBD)
- [ ] React Nativeプロジェクト作成
- [ ] コード共有の最適化
- [ ] モバイルUI実装
- [ ] ストア申請

---

## 10. 技術的制約・前提条件

### 10.1 API制約
- **Whisper API**: 25MB/ファイル、リクエストレート制限
- **Claude API**: トークン制限、コスト考慮

### 10.2 システム要件
- **Node.js**: 20.0.0以上（package.jsonで指定）
- **npm**: 9.0.0以上
- **FFmpeg**: 音声処理に必須
- **ディスク容量**: 音声ファイル + データベース分の空き容量

### 10.3 開発環境
- **OS**: macOS, Windows, Linux
- **エディタ**: VS Code推奨
- **パッケージマネージャー**: npm / pnpm
- **テストカバレッジ閾値**: 70%（Phase 1）→ 80%（Phase 2以降）
  - Lines, Functions, Branches, Statementsすべて70%以上を要求

---

## 11. 今後の検討事項

### 11.1 機能拡張案
- リアルタイム文字起こし（マイク入力）
- 複数ファイルの一括処理
- クラウド同期（オプション機能として）
- 動画ファイルからの音声抽出

### 11.2 技術的改善案
- WebAssemblyを使ったローカルWhisper実行
- GPU加速
- インクリメンタルな文字起こし（長時間音声の中間保存）

### 11.3 UI/UX改善案
- ダークモード対応
- キーボードショートカット
- ドラッグ&ドロップ対応
- チュートリアル/オンボーディング

---

## 12. 参考資料

- [OpenAI Whisper API Documentation](https://platform.openai.com/docs/guides/speech-to-text)
- [Anthropic Claude API Documentation](https://docs.anthropic.com/)
- [Electron Documentation](https://www.electronjs.org/docs/latest/)
- [React Documentation](https://react.dev/)
- [SQLite Documentation](https://www.sqlite.org/docs.html)
- [GitHub Actions Documentation](https://docs.github.com/ja/actions)
- [electron-builder Documentation](https://www.electron.build/)
- [Semantic Versioning](https://semver.org/)

---

## 13. CI/CD セットアップ

このプロジェクトでは、GitHub Actions を使用して継続的インテグレーション（CI）と継続的デプロイメント（CD）を実現しています。

### 13.1 ワークフロー概要

#### CI ワークフロー (`.github/workflows/ci.yml`)

**トリガー条件:**
- `main` または `develop` ブランチへの push
- Pull Request の作成/更新

**実行内容:**
- **Lint**: ESLint によるコード品質チェック
- **Type Check**: TypeScript の型チェック
- **Test**: Vitest による単体テスト、カバレッジレポート
- **Build**: クロスプラットフォーム（macOS, Windows, Linux）でのビルドチェック

**ステータスバッジ:**
```markdown
![CI](https://github.com/hirochikashindo/transcription-app/workflows/CI/badge.svg)
```

#### Release ワークフロー (`.github/workflows/release.yml`)

**トリガー条件:**
- `v*` 形式のタグ（例: `v1.0.0`, `v2.1.3`）が push された時

**実行内容:**
1. **クロスプラットフォームビルド**:
   - macOS: `.dmg` と `.zip`
   - Windows: `.exe` (NSIS インストーラー) と `.exe` (ポータブル版)
   - Linux: `.AppImage` と `.deb`

2. **GitHub Release の自動作成**:
   - ビルド成果物を自動アップロード
   - リリースノートを自動生成

### 13.2 リリース手順

#### 1. バージョン番号の確認

現在のバージョンを確認:
```bash
make version
```

#### 2. リリースタグの作成

Makefile を使用してリリースタグを作成・プッシュ:
```bash
make release VERSION=v1.0.0
```

このコマンドは以下を実行します:
1. `v1.0.0` タグをローカルで作成
2. タグをリモートリポジトリにプッシュ
3. GitHub Actions が自動的にビルドを開始

#### 3. リリースの確認

1. [GitHub Actions](https://github.com/hirochikashindo/transcription-app/actions) でビルドの進行状況を確認
2. ビルドが完了したら、[Releases](https://github.com/hirochikashindo/transcription-app/releases) ページで配布物を確認

### 13.3 Makefile コマンド

プロジェクトでは、よく使うコマンドを Makefile にまとめています。

#### 開発用コマンド

```bash
make help           # ヘルプを表示
make install        # 依存パッケージをインストール
make setup          # プロジェクトの初期セットアップ
make dev            # 開発サーバーを起動（Electron）
make dev-web        # 開発サーバーを起動（Web のみ）
```

#### テスト用コマンド

```bash
make test           # テストを実行
make test-watch     # テストをウォッチモードで実行
make test-ui        # Vitest UI を起動
make test-e2e       # E2E テストを実行
make test-coverage  # カバレッジレポートを生成
```

#### コード品質チェック

```bash
make lint           # Lint チェックを実行
make lint-fix       # Lint の自動修正を実行
make format         # コードフォーマットを実行
make format-check   # フォーマットチェックを実行
make type-check     # TypeScript の型チェックを実行
make ci             # すべてのチェックを実行（CI 用）
```

#### ビルド用コマンド

```bash
make build          # アプリケーションをビルド
make build-dir      # アプリケーションをビルド（インストーラーなし）
make build-mac      # macOS 用インストーラーをビルド
make build-win      # Windows 用インストーラーをビルド
make build-linux    # Linux 用インストーラーをビルド
make clean          # ビルド成果物を削除
make clean-all      # 完全クリーン（node_modules も削除）
```

#### リリース管理コマンド

```bash
make release VERSION=v1.0.0         # リリースタグを作成してプッシュ
make delete-release VERSION=v1.0.0  # リリースタグを削除（ローカルとリモート）
make version                        # バージョン番号を確認
make tags                           # Git タグの一覧を表示
make info                           # プロジェクト情報を表示
```

### 13.4 ローカルでのビルドテスト

リリース前に、ローカル環境でビルドをテストできます:

```bash
# 現在の OS 用のインストーラーをビルド
make build

# または、インストーラーなしでビルド（高速）
make build-dir
```

ビルドされたファイルは `release/<version>` ディレクトリに出力されます。

### 13.5 トラブルシューティング

#### ビルドエラー

**問題**: macOS でビルドが失敗する
```
Error: Application entry file "dist-electron/main.js" does not exist
```

**解決策**:
```bash
# まず TypeScript をコンパイル
npm run type-check
# 次にビルド
make build
```

#### GitHub Actions でのビルド失敗

**問題**: `GITHUB_TOKEN` の権限エラー

**解決策**:
1. リポジトリの Settings → Actions → General
2. "Workflow permissions" を "Read and write permissions" に設定

#### リリースタグの修正

間違ったタグを push してしまった場合:

```bash
# ローカルとリモートのタグを削除
make delete-release VERSION=v1.0.0

# 正しいバージョンで再度リリース
make release VERSION=v1.0.1
```

### 13.6 環境変数

#### GitHub Secrets

GitHub Actions で使用される環境変数:

- `GITHUB_TOKEN`: GitHub が自動で提供（設定不要）
- 将来的に必要になる可能性のあるシークレット:
  - `APPLE_ID`: macOS 公証用（notarization）
  - `APPLE_ID_PASSWORD`: macOS 公証用
  - `CSC_LINK`: コード署名証明書（macOS/Windows）
  - `CSC_KEY_PASSWORD`: 証明書のパスワード

#### ローカル環境変数

`.env` ファイルで設定:
```bash
# OpenAI API Key (文字起こし用)
OPENAI_API_KEY=your_openai_api_key_here

# Anthropic API Key (要約生成用、将来的に使用)
# ANTHROPIC_API_KEY=your_anthropic_api_key_here
```

### 13.7 ベストプラクティス

#### リリース前チェックリスト

- [ ] すべてのテストが通過している
- [ ] Lint エラーがない
- [ ] 型チェックエラーがない
- [ ] `package.json` のバージョン番号を更新
- [ ] CHANGELOG.md を更新（オプション）
- [ ] ローカルでビルドテストを実行
- [ ] `make release VERSION=vX.Y.Z` でリリース

#### バージョニング規則

[Semantic Versioning](https://semver.org/) に従います:

- **Major (X.0.0)**: 破壊的変更
- **Minor (0.X.0)**: 後方互換性のある機能追加
- **Patch (0.0.X)**: 後方互換性のあるバグ修正

例:
- `v1.0.0`: 最初の安定版リリース
- `v1.1.0`: 新機能追加
- `v1.1.1`: バグ修正

#### ブランチ戦略

- `main`: 本番環境用の安定版
- `develop`: 開発用ブランチ
- `feature/*`: 機能開発用ブランチ
- `hotfix/*`: 緊急修正用ブランチ

---

## 14. 詳細設計ドキュメント

プロジェクトの詳細な設計仕様は、以下の個別ドキュメントで管理されています：

### 14.1 データモデル設計

**ドキュメント**: [docs/ER.md](./docs/ER.md)

- ER図（Mermaid形式）
- 全テーブルの詳細仕様
- リレーション、制約、インデックス
- クエリ例とパフォーマンス考慮事項

### 14.2 画面設計

**ドキュメント**: [docs/screen.md](./docs/screen.md)

- 全画面の詳細設計
- レイアウト図とワイヤーフレーム
- コンポーネント階層
- 状態管理の仕様
- UIコンポーネント仕様

### 14.3 API仕様

**ドキュメント**: [docs/api.md](./docs/api.md)

- IPC API完全仕様
- 全エンドポイントのリクエスト/レスポンス型定義
- エラーハンドリング
- 使用例とコード例

### 14.4 テスト仕様

**ドキュメント**: [docs/test.md](./docs/test.md)

- テスト戦略とカバレッジ目標
- Unit Test、Integration Test、E2E Testのケース一覧
- テストユーティリティとモックデータ
- CI/CD統合

### 14.5 データベースマイグレーション

**ドキュメント**: [docs/database-migrations.md](./docs/database-migrations.md)

- マイグレーション戦略
- ファイル命名規則と作成手順
- ベストプラクティス
- トラブルシューティング

### 14.6 セキュリティ

**ドキュメント**: [docs/security.md](./docs/security.md)

- Electronセキュリティ設定（サンドボックス、Context Isolation）
- API Keyの安全な管理
- データベースセキュリティ（SQLインジェクション対策）
- XSS対策とファイルアクセス制御
- セキュリティチェックリスト

---

**最終更新**: 2026-01-03
**バージョン**: 1.3
