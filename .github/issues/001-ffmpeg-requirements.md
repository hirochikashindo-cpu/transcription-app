# [P0] FFmpegのインストール要件を明記

## 問題の説明

現在、Claude.md (セクション10.2)で「FFmpeg: 音声処理に必須」と記載されていますが、FFmpegのインストール方法がドキュメント化されていません。

FFmpegはシステムレベルのツールであり、npmパッケージとしてインストールできません。`fluent-ffmpeg`はFFmpegのNode.jsラッパーですが、FFmpeg本体が別途必要です。

### 影響範囲

- ユーザーが手動でFFmpegをインストールする必要があるが、手順が不明
- アプリケーション起動時にFFmpegが見つからずエラーになる可能性
- CI/CDパイプラインでFFmpegが利用できない

## 期待される結果

1. README.mdにFFmpegのインストール手順を明記
2. アプリケーション起動時にFFmpegの存在をチェック
3. FFmpegが見つからない場合、ユーザーにわかりやすいエラーメッセージを表示
4. CI/CDワークフローでFFmpegをインストール

## 実装提案

### 1. README.mdに追加

```markdown
## 事前要件

### FFmpegのインストール

このアプリケーションは音声処理にFFmpegを使用します。以下の手順でインストールしてください：

**macOS:**
\`\`\`bash
brew install ffmpeg
\`\`\`

**Windows:**
1. https://ffmpeg.org/download.html からダウンロード
2. ダウンロードしたファイルを解凍
3. `bin`フォルダをPATHに追加

**Linux (Ubuntu/Debian):**
\`\`\`bash
sudo apt-get update
sudo apt-get install ffmpeg
\`\`\`

**インストール確認:**
\`\`\`bash
ffmpeg -version
\`\`\`
```

### 2. FFmpegチェック機能の実装

`electron/utils/ffmpeg-check.ts`:
```typescript
import { execSync } from 'child_process'

export function checkFFmpegInstalled(): boolean {
  try {
    execSync('ffmpeg -version', { stdio: 'ignore' })
    return true
  } catch (error) {
    return false
  }
}

export function showFFmpegError(window: BrowserWindow) {
  dialog.showErrorBox(
    'FFmpeg Not Found',
    'FFmpeg is required but not installed.\n\n' +
    'Please install FFmpeg:\n' +
    'macOS: brew install ffmpeg\n' +
    'Windows: https://ffmpeg.org/download.html\n' +
    'Linux: sudo apt-get install ffmpeg'
  )
}
```

### 3. CI/CDワークフローに追加

`.github/workflows/ci.yml`:
```yaml
- name: Install FFmpeg (Ubuntu)
  if: matrix.os == 'ubuntu-latest'
  run: sudo apt-get install ffmpeg

- name: Install FFmpeg (macOS)
  if: matrix.os == 'macos-latest'
  run: brew install ffmpeg

- name: Install FFmpeg (Windows)
  if: matrix.os == 'windows-latest'
  run: choco install ffmpeg
```

## 受け入れ基準

- [ ] README.mdにFFmpegインストール手順が追加されている
- [ ] アプリケーション起動時にFFmpegの存在確認が実装されている
- [ ] FFmpegが見つからない場合、エラーダイアログが表示される
- [ ] CI/CDワークフローでFFmpegがインストールされている
- [ ] ドキュメントのインストール手順が正確で実行可能

## ラベル

`priority:p0`, `type:documentation`, `type:enhancement`, `phase:1`

## マイルストーン

Phase 1 - MVP
