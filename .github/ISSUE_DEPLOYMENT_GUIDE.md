# GitHub Issue デプロイメントガイド

## 📋 概要

このガイドでは、設計レビューで特定された問題とPhase 1実装タスクをGitHub Issueとして作成する手順を説明します。

**作成済みIssue数**: 11件（P0: 3件、P1: 6件、P2-P3: 2件）

---

## 🚀 自動デプロイ方法（推奨）

### Step 1: GitHub CLI認証

```bash
gh auth login
```

認証方法を選択：
1. **GitHub.com**を選択
2. **HTTPS**を選択
3. **Login with a web browser**を選択
4. ワンタイムコードをコピー
5. ブラウザで認証を完了

### Step 2: リポジトリセットアップ

```bash
./scripts/setup-github.sh
```

このスクリプトは以下を自動実行します：
- ✅ GitHubリポジトリ作成（`hirochikashindo/transcription-app`）
- ✅ 初期コミット作成
- ✅ コードをGitHubにプッシュ
- ✅ Issueラベル作成（12種類）
- ✅ マイルストーン作成（Phase 1, 2, 3）

### Step 3: Issue作成

```bash
./scripts/deploy-issues.sh
```

このスクリプトは`.github/issues/`内の全マークダウンファイルから自動的にIssueを作成します。

---

## 📝 手動デプロイ方法

自動スクリプトが使用できない場合の手動手順：

### 1. リポジトリ作成

1. https://github.com/new にアクセス
2. リポジトリ名: `transcription-app`
3. Description: `Audio transcription and meeting minutes application`
4. Public
5. **Create repository**

### 2. ローカルリポジトリの接続

```bash
git remote add origin https://github.com/hirochikashindo/transcription-app.git
git add .
git commit -m "Initial commit: Project setup with CI/CD"
git push -u origin main
```

### 3. ラベル作成

GitHub → Settings → Labels で以下を作成：

**優先度ラベル:**
- `priority:p0` (#d73a4a) - Blocker
- `priority:p1` (#ff9800) - Critical
- `priority:p2` (#ffeb3b) - High
- `priority:p3` (#cddc39) - Medium

**タイプラベル:**
- `type:bug` (#d73a4a)
- `type:enhancement` (#a2eeef)
- `type:documentation` (#0075ca)
- `type:security` (#ff5722)

**フェーズラベル:**
- `phase:1` (#7057ff) - Phase 1 - MVP
- `phase:2` (#7057ff) - Phase 2
- `phase:3` (#7057ff) - Phase 3

**コンポーネントラベル:**
- `component:database` (#bfd4f2)
- `component:ui` (#bfd4f2)
- `component:whisper` (#bfd4f2)
- `component:export` (#bfd4f2)

### 4. マイルストーン作成

GitHub → Issues → Milestones で作成：

1. **Phase 1 - MVP**
   - Due date: 2026-02-14
   - Description: Minimum Viable Product

2. **Phase 2 - Extensions**
   - Description: Speaker recognition and custom dictionary

3. **Phase 3 - AI Enhancement**
   - Description: AI summary and audio playback

### 5. Issue作成

`.github/issues/`内の各マークダウンファイルから手動でIssueを作成：

#### P0 Issues（実装開始前に必須）

**Issue #1: FFmpegのインストール要件を明記**
- タイトル: `001-ffmpeg-requirements.md`の最初の見出し
- 本文: ファイル内容をコピー
- ラベル: `priority:p0`, `type:documentation`, `type:enhancement`, `phase:1`
- マイルストーン: Phase 1 - MVP

**Issue #2: データベース初期化とマイグレーション戦略の定義**
- ファイル: `002-database-initialization.md`
- ラベル: `priority:p0`, `type:enhancement`, `phase:1`

**Issue #3: 欠落設計ドキュメントの作成**
- ファイル: `003-missing-documentation.md`
- ラベル: `priority:p0`, `type:documentation`, `phase:1`

#### P1 Issues（Phase 1実装中に必須）

**Issue #4: API Key管理のセキュリティ強化**
- ファイル: `004-api-key-security.md`
- ラベル: `priority:p1`, `type:security`, `type:enhancement`, `phase:1`

**Issue #5: 型定義の整理と一元化**
- ファイル: `005-type-definitions-cleanup.md`
- ラベル: `priority:p1`, `type:enhancement`, `phase:1`

**Issue #10: ProjectRepositoryの実装**
- ファイル: `010-implement-project-repository.md`
- ラベル: `priority:p1`, `type:enhancement`, `phase:1`, `component:database`

**Issue #11: Whisper API連携サービスの実装**
- ファイル: `011-implement-whisper-service.md`
- ラベル: `priority:p1`, `type:enhancement`, `phase:1`, `component:whisper`

**Issue #12: ダッシュボードUIと状態管理の実装**
- ファイル: `012-implement-dashboard-ui.md`
- ラベル: `priority:p1`, `type:enhancement`, `phase:1`, `component:ui`

**Issue #13: エクスポート機能の実装**
- ファイル: `013-implement-export-service.md`
- ラベル: `priority:p1`, `type:enhancement`, `phase:1`, `component:export`

#### P2-P3 Issues

**Issue #20: Node.jsバージョンをpackage.jsonに明記**
- ファイル: `020-node-version-specification.md`
- ラベル: `priority:p2`, `type:documentation`, `phase:1`

**Issue #21: テストカバレッジ閾値の調整**
- ファイル: `021-test-coverage-adjustment.md`
- ラベル: `priority:p2`, `type:enhancement`, `phase:1`

**Issue #22: Electronサンドボックスの有効化検討**
- ファイル: `022-electron-sandbox.md`
- ラベル: `priority:p3`, `type:security`, `phase:2`

---

## ✅ 確認事項

全Issueが作成されたら、以下を確認：

- [ ] 11個のIssueが作成されている
- [ ] すべてのIssueに適切なラベルが付いている
- [ ] P0, P1のIssueに「Phase 1 - MVP」マイルストーンが設定されている
- [ ] Issue番号が論理的な順序になっている

---

## 📊 Issue一覧

| No | タイトル | 優先度 | コンポーネント | 見積 |
|----|---------|--------|---------------|------|
| #1 | FFmpegのインストール要件を明記 | P0 | - | 2h |
| #2 | データベース初期化とマイグレーション戦略の定義 | P0 | database | 4h |
| #3 | 欠落設計ドキュメントの作成 | P0 | - | 8h |
| #4 | API Key管理のセキュリティ強化 | P1 | - | 4h |
| #5 | 型定義の整理と一元化 | P1 | - | 2h |
| #10 | ProjectRepositoryの実装 | P1 | database | 6h |
| #11 | Whisper API連携サービスの実装 | P1 | whisper | 8h |
| #12 | ダッシュボードUIと状態管理の実装 | P1 | ui | 6h |
| #13 | エクスポート機能の実装 | P1 | export | 4h |
| #20 | Node.jsバージョンをpackage.jsonに明記 | P2 | - | 0.5h |
| #21 | テストカバレッジ閾値の調整 | P2 | - | 0.5h |
| #22 | Electronサンドボックスの有効化検討 | P3 | - | 2h |

**合計見積**: 47時間

---

## 🎯 次のステップ

Issueデプロイ完了後：

1. **P0 Issue（#1-3）を先に完了**
   - FFmpegインストール手順の追加
   - データベース初期化実装
   - 設計ドキュメント作成

2. **Phase 1実装開始**
   - Issue #10から順番に実装
   - 各Issueにブランチを作成
   - PRでレビュー＆マージ

3. **週次進捗確認**
   - マイルストーンの進捗確認
   - ブロッカーの特定と解消

---

## 🆘 トラブルシューティング

### gh auth loginが失敗する

```bash
# トークンを使用した認証
gh auth login --with-token < token.txt
```

### スクリプト実行権限エラー

```bash
chmod +x scripts/*.sh
```

### リポジトリが既に存在する

```bash
# 既存リポジトリを使用する場合
git remote add origin https://github.com/hirochikashindo/transcription-app.git
git push -u origin main
```

---

**作成日**: 2026-01-03
**最終更新**: 2026-01-03
