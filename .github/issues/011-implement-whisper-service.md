# [Phase 1] Whisper API連携サービスの実装

## 概要

OpenAI Whisper APIを使用した音声文字起こし機能の実装。ファイル分割、並列処理、進捗通知を含みます。

## 実装内容

### 主要機能

1. **音声ファイルの検証とメタデータ取得** (fluent-ffmpeg使用)
2. **25MB制限対応のファイル分割**
3. **Whisper API呼び出し**
4. **分割結果のマージ**
5. **進捗通知** (IPC経由)
6. **エラーハンドリングとリトライ**

## ファイル構成

```
electron/services/whisper/
├── whisper-service.ts      # メインサービス
├── file-splitter.ts        # ファイル分割
├── audio-metadata.ts       # メタデータ取得
└── api-client.ts           # Whisper API client
```

## 受け入れ基準

- [ ] 音声ファイルのメタデータ取得
- [ ] 25MB超過ファイルの自動分割
- [ ] Whisper API呼び出しとレスポンス処理
- [ ] 分割結果のマージ
- [ ] 進捗通知(0-100%)の送信
- [ ] エラー時の3回リトライ
- [ ] テストカバレッジ70%以上

## ラベル

`priority:p1`, `type:enhancement`, `phase:1`, `component:whisper`

## 見積もり

8時間
