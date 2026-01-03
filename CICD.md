# CI/CD セットアップガイド

このドキュメントでは、transcription-app の CI/CD パイプラインの設定と使い方について説明します。

## 概要

このプロジェクトでは、GitHub Actions を使用して以下の自動化を実現しています：

- **継続的インテグレーション (CI)**: コードの品質チェック（Lint、型チェック、テスト）
- **継続的デプロイメント (CD)**: クロスプラットフォームのインストーラービルドと配布

## ワークフロー

### 1. CI ワークフロー (`.github/workflows/ci.yml`)

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

### 2. Release ワークフロー (`.github/workflows/release.yml`)

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

## リリース手順

### 1. バージョン番号の確認

現在のバージョンを確認:
```bash
make version
```

### 2. リリースタグの作成

Makefile を使用してリリースタグを作成・プッシュ:
```bash
make release VERSION=v1.0.0
```

このコマンドは以下を実行します:
1. `v1.0.0` タグをローカルで作成
2. タグをリモートリポジトリにプッシュ
3. GitHub Actions が自動的にビルドを開始

### 3. リリースの確認

1. [GitHub Actions](https://github.com/hirochikashindo/transcription-app/actions) でビルドの進行状況を確認
2. ビルドが完了したら、[Releases](https://github.com/hirochikashindo/transcription-app/releases) ページで配布物を確認

## Makefile コマンド

プロジェクトでは、よく使うコマンドを Makefile にまとめています。

### 開発用コマンド

```bash
# ヘルプを表示
make help

# 依存パッケージをインストール
make install

# プロジェクトの初期セットアップ
make setup

# 開発サーバーを起動（Electron）
make dev

# 開発サーバーを起動（Web のみ）
make dev-web
```

### テスト用コマンド

```bash
# テストを実行
make test

# テストをウォッチモードで実行
make test-watch

# Vitest UI を起動
make test-ui

# E2E テストを実行
make test-e2e

# カバレッジレポートを生成
make test-coverage
```

### コード品質チェック

```bash
# Lint チェックを実行
make lint

# Lint の自動修正を実行
make lint-fix

# コードフォーマットを実行
make format

# フォーマットチェックを実行
make format-check

# TypeScript の型チェックを実行
make type-check

# すべてのチェックを実行（CI 用）
make ci
```

### ビルド用コマンド

```bash
# アプリケーションをビルド
make build

# アプリケーションをビルド（インストーラーなし）
make build-dir

# macOS 用インストーラーをビルド
make build-mac

# Windows 用インストーラーをビルド
make build-win

# Linux 用インストーラーをビルド
make build-linux

# ビルド成果物を削除
make clean

# 完全クリーン（node_modules も削除）
make clean-all
```

### リリース管理コマンド

```bash
# リリースタグを作成してプッシュ
make release VERSION=v1.0.0

# リリースタグを削除（ローカルとリモート）
make delete-release VERSION=v1.0.0

# バージョン番号を確認
make version

# Git タグの一覧を表示
make tags

# プロジェクト情報を表示
make info
```

## ローカルでのビルドテスト

リリース前に、ローカル環境でビルドをテストできます:

```bash
# 現在の OS 用のインストーラーをビルド
make build

# または、インストーラーなしでビルド（高速）
make build-dir
```

ビルドされたファイルは `release/<version>` ディレクトリに出力されます。

## トラブルシューティング

### ビルドエラー

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

### GitHub Actions でのビルド失敗

**問題**: `GITHUB_TOKEN` の権限エラー

**解決策**:
1. リポジトリの Settings → Actions → General
2. "Workflow permissions" を "Read and write permissions" に設定

### リリースタグの修正

間違ったタグを push してしまった場合:

```bash
# ローカルとリモートのタグを削除
make delete-release VERSION=v1.0.0

# 正しいバージョンで再度リリース
make release VERSION=v1.0.1
```

## 環境変数

### GitHub Secrets

GitHub Actions で使用される環境変数:

- `GITHUB_TOKEN`: GitHub が自動で提供（設定不要）
- 将来的に必要になる可能性のあるシークレット:
  - `APPLE_ID`: macOS 公証用（notarization）
  - `APPLE_ID_PASSWORD`: macOS 公証用
  - `CSC_LINK`: コード署名証明書（macOS/Windows）
  - `CSC_KEY_PASSWORD`: 証明書のパスワード

### ローカル環境変数

`.env` ファイルで設定:
```bash
# OpenAI API Key (文字起こし用)
OPENAI_API_KEY=your_openai_api_key_here

# Anthropic API Key (要約生成用、将来的に使用)
# ANTHROPIC_API_KEY=your_anthropic_api_key_here
```

## ベストプラクティス

### リリース前チェックリスト

- [ ] すべてのテストが通過している
- [ ] Lint エラーがない
- [ ] 型チェックエラーがない
- [ ] `package.json` のバージョン番号を更新
- [ ] CHANGELOG.md を更新（オプション）
- [ ] ローカルでビルドテストを実行
- [ ] `make release VERSION=vX.Y.Z` でリリース

### バージョニング規則

[Semantic Versioning](https://semver.org/) に従います:

- **Major (X.0.0)**: 破壊的変更
- **Minor (0.X.0)**: 後方互換性のある機能追加
- **Patch (0.0.X)**: 後方互換性のあるバグ修正

例:
- `v1.0.0`: 最初の安定版リリース
- `v1.1.0`: 新機能追加
- `v1.1.1`: バグ修正

### ブランチ戦略

- `main`: 本番環境用の安定版
- `develop`: 開発用ブランチ
- `feature/*`: 機能開発用ブランチ
- `hotfix/*`: 緊急修正用ブランチ

## 参考リンク

- [GitHub Actions ドキュメント](https://docs.github.com/ja/actions)
- [electron-builder ドキュメント](https://www.electron.build/)
- [Semantic Versioning](https://semver.org/)
