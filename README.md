# Transcription App

音声ファイルの文字起こし、編集、議事録・イベントサマリ作成アプリケーション

## 特徴

- **高精度な文字起こし**: OpenAI Whisper APIを使用
- **長時間音声対応**: 4時間以上の音声も自動分割処理
- **編集機能**: 文字起こし結果の編集・修正
- **複数フォーマット対応**: JSON、Markdown形式でエクスポート
- **クロスプラットフォーム**: Windows、macOS、Linux対応

## 技術スタック

- **フロントエンド**: React 18 + TypeScript
- **デスクトップ**: Electron
- **状態管理**: Zustand
- **ビルドツール**: Vite
- **データベース**: SQLite (better-sqlite3)
- **音声処理**: fluent-ffmpeg
- **API**: OpenAI Whisper API, Claude API (Phase 3)

## 開発ロードマップ

### Phase 1: MVP (現在の開発対象)
- [x] 基本的な文字起こし機能
- [x] 文字起こし結果の編集機能
- [x] JSON/Markdownエクスポート
- [x] プロジェクト管理

### Phase 2: 拡張機能
- [ ] 話者認識・分離機能
- [ ] カスタム辞書管理

### Phase 3: AI機能強化
- [ ] AI要約・議事録生成
- [ ] 音声再生機能

## セットアップ

### 事前要件

このアプリケーションを実行する前に、以下がインストールされている必要があります：

- **Node.js**: 18.x 以上
- **npm** または **pnpm**
- **FFmpeg**: 音声処理に必須（下記参照）

#### FFmpegのインストール

このアプリケーションは音声処理にFFmpegを使用します。以下の手順でインストールしてください：

**macOS:**
```bash
brew install ffmpeg
```

**Windows:**
1. https://ffmpeg.org/download.html からダウンロード
2. ダウンロードしたファイルを解凍
3. `bin`フォルダをPATHに追加

**Linux (Ubuntu/Debian):**
```bash
sudo apt-get update
sudo apt-get install ffmpeg
```

**インストール確認:**
```bash
ffmpeg -version
```

正常にインストールされている場合、FFmpegのバージョン情報が表示されます。

### インストール

1. リポジトリのクローン
```bash
git clone <repository-url>
cd transcription-app
```

2. 依存パッケージのインストール
```bash
npm install
# または
pnpm install
```

3. セットアップスクリプトの実行
```bash
npm run setup
```

このスクリプトは以下を実行します:
- ディレクトリ構造の作成
- .envファイルの生成
- 初期ファイルの作成

4. 環境変数の設定

`.env`ファイルを編集して、APIキーを設定:
```env
OPENAI_API_KEY=your_openai_api_key_here
ANTHROPIC_API_KEY=your_anthropic_api_key_here  # Phase 3で使用
```

## コード品質ガードレール

このプロジェクトには、コード品質を保証するための複数のガードレールが実装されています。

### 自動チェック
- **pre-commit**: コミット前にLint・Format・Type Check
- **commit-msg**: コミットメッセージの形式チェック（Conventional Commits）
- **pre-push**: プッシュ前にテスト実行
- **CI/CD**: GitHub Actionsで自動テスト・ビルド・セキュリティチェック

詳細は [GUARDRAILS.md](./GUARDRAILS.md) を参照してください。

### コミットメッセージ形式
```bash
feat: 新機能追加
fix: バグ修正
docs: ドキュメント更新
test: テスト追加・修正
refactor: リファクタリング
```

## 開発

### 開発サーバーの起動

```bash
# Webのみ (Viteのみ)
npm run dev

# Electronアプリとして起動
npm run dev:electron
```

### ビルド

```bash
# 全プラットフォーム向けビルド
npm run build

# プラットフォーム別ビルド
npm run build:win    # Windows
npm run build:mac    # macOS
npm run build:linux  # Linux

# ビルド済みファイルをテスト (インストーラー作成なし)
npm run build:dir
```

### その他のコマンド

```bash
# 型チェック
npm run type-check

# Lint
npm run lint

# フォーマット
npm run format

# テスト
npm run test

# テストUI
npm run test:ui
```

## プロジェクト構造

```
transcription-app/
├── electron/              # Electronメインプロセス
│   ├── main.ts            # エントリーポイント
│   ├── preload.ts         # Preloadスクリプト
│   ├── services/          # バックエンドサービス
│   └── ipc/               # IPCハンドラー
├── src/                   # Reactフロントエンド
│   ├── pages/             # ページコンポーネント
│   ├── components/        # 再利用可能コンポーネント
│   ├── hooks/             # カスタムフック
│   ├── store/             # 状態管理
│   ├── services/          # フロントエンドサービス
│   ├── types/             # 型定義
│   └── utils/             # ユーティリティ
├── shared/                # 共有コード
├── tests/                 # テストコード
└── scripts/               # ビルド・セットアップスクリプト
```

## 使い方

### 1. プロジェクトの作成

1. アプリを起動
2. 「新規プロジェクト」をクリック
3. 音声ファイルを選択

### 2. 文字起こし

- ファイル選択後、自動で文字起こしが開始
- 進捗状況がリアルタイムで表示
- 4時間以上の音声は自動的に分割処理

### 3. 編集

- 文字起こし結果を直接編集可能
- タイムスタンプと共に表示
- セグメント単位で編集

### 4. エクスポート

- JSON形式: メタデータ含む完全なデータ
- Markdown形式: 読みやすい議事録形式

## トラブルシューティング

### FFmpegエラー
```
Error: ffmpeg not found
```
FFmpegがインストールされていない、またはPATHが通っていません。上記のインストール手順を確認してください。

### API Key エラー
```
Error: Invalid API key
```
`.env`ファイルのAPIキーが正しく設定されているか確認してください。

### ビルドエラー

依存関係を再インストール:
```bash
rm -rf node_modules package-lock.json
npm install
```

## ライセンス

MIT

## 貢献

プルリクエストを歓迎します。大きな変更の場合は、まずissueを開いて変更内容を議論してください。

## サポート

問題が発生した場合は、GitHubのissueを作成してください。
