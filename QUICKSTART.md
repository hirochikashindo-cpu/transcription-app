# クイックスタートガイド

## 初回セットアップ (5分)

### 1. 依存パッケージのインストール

```bash
cd transcription-app
npm install
```

または pnpm を使用:
```bash
pnpm install
```

### 2. プロジェクト構造の作成

```bash
npm run setup
```

対話形式で以下を設定:
- OpenAI API Key (スキップ可能、後で設定可)

### 3. FFmpegのインストール

**macOS:**
```bash
brew install ffmpeg
```

**Windows:**
- [FFmpeg公式サイト](https://ffmpeg.org/download.html)からダウンロード
- 解凍してPATHに追加

**Linux:**
```bash
sudo apt-get update
sudo apt-get install ffmpeg
```

### 4. API Keyの設定

`.env`ファイルを編集:
```env
OPENAI_API_KEY=sk-your-actual-api-key-here
```

OpenAI API Keyは [OpenAI Platform](https://platform.openai.com/api-keys) から取得できます。

### 5. 開発サーバーの起動

```bash
npm run dev:electron
```

ブラウザとElectronアプリが自動的に起動します。

## 開発ワークフロー

### コードの編集

1. `src/`ディレクトリ内のファイルを編集
2. 保存すると自動でホットリロード
3. Electron Main Process (`electron/`)の変更は再起動が必要

### ビルドとテスト

```bash
# 型チェック
npm run type-check

# Lint
npm run lint

# フォーマット
npm run format

# ビルド (テスト用)
npm run build:dir
```

## よくある問題と解決方法

### Q: `ffmpeg not found` エラー

**A:** FFmpegがインストールされていないか、PATHが通っていません。
```bash
# 確認方法
ffmpeg -version

# macOSの場合
brew install ffmpeg
```

### Q: `Cannot find module 'better-sqlite3'` エラー

**A:** ネイティブモジュールのリビルドが必要です。
```bash
npm rebuild better-sqlite3
```

### Q: 開発サーバーが起動しない

**A:** ポート5173が使用中の可能性があります。
```bash
# ポート確認
lsof -i :5173

# プロセスを終了して再起動
npm run dev:electron
```

### Q: API Keyが認識されない

**A:** `.env`ファイルの場所と内容を確認:
```bash
# ファイルが存在するか確認
ls -la .env

# 内容を確認
cat .env
```

## 次のステップ

1. **アーキテクチャドキュメントを読む**
   - システム構成を理解
   - データフローを確認

2. **最初の機能を実装**
   - プロジェクト一覧ページから開始
   - ファイルアップロード機能を追加

3. **データベースサービスを実装**
   - `electron/services/database/`を実装
   - マイグレーションスクリプトを作成

4. **Whisper API連携**
   - `electron/services/whisper/`を実装
   - テスト用の短い音声ファイルで動作確認

## 推奨開発環境

- **エディタ**: VS Code
- **拡張機能**:
  - ESLint
  - Prettier
  - TypeScript and JavaScript Language Features

VS Codeを使用する場合、推奨拡張機能のインストールを促されます。

## コミュニティとサポート

- 問題が発生した場合はGitHub Issuesで報告
- ドキュメントの改善提案も歓迎

## 参考リンク

- [Electron公式ドキュメント](https://www.electronjs.org/docs/latest/)
- [Vite公式ドキュメント](https://vitejs.dev/)
- [React公式ドキュメント](https://react.dev/)
- [OpenAI Whisper API](https://platform.openai.com/docs/guides/speech-to-text)
