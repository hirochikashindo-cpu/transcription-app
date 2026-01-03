.PHONY: help install dev build test lint format clean release

# デフォルトターゲット
help:
	@echo "利用可能なコマンド:"
	@echo "  make install      - 依存パッケージをインストール"
	@echo "  make setup        - プロジェクトの初期セットアップ"
	@echo "  make dev          - 開発サーバーを起動（Electron）"
	@echo "  make dev-web      - 開発サーバーを起動（Web）"
	@echo "  make test         - テストを実行"
	@echo "  make test-watch   - テストをウォッチモードで実行"
	@echo "  make test-ui      - Vitest UIを起動"
	@echo "  make test-e2e     - E2Eテストを実行"
	@echo "  make test-coverage - カバレッジレポートを生成"
	@echo "  make lint         - Lintチェックを実行"
	@echo "  make lint-fix     - Lintの自動修正を実行"
	@echo "  make format       - コードフォーマットを実行"
	@echo "  make format-check - フォーマットチェックを実行"
	@echo "  make type-check   - TypeScriptの型チェックを実行"
	@echo "  make build        - アプリケーションをビルド"
	@echo "  make build-dir    - アプリケーションをビルド（インストーラーなし）"
	@echo "  make build-mac    - macOS用インストーラーをビルド"
	@echo "  make build-win    - Windows用インストーラーをビルド"
	@echo "  make build-linux  - Linux用インストーラーをビルド"
	@echo "  make clean        - ビルド成果物を削除"
	@echo "  make release      - リリースタグを作成してプッシュ"
	@echo "  make ci           - CI環境でのテスト・ビルドを実行"

# 依存パッケージのインストール
install:
	npm install

# プロジェクトの初期セットアップ
setup:
	npm run setup

# 開発サーバーの起動（Electron）
dev:
	npm run dev:electron

# 開発サーバーの起動（Web）
dev-web:
	npm run dev

# テスト実行
test:
	npm run test

# テストをウォッチモードで実行
test-watch:
	npm run test:watch

# Vitest UIを起動
test-ui:
	npm run test:ui

# E2Eテストを実行
test-e2e:
	npm run test:e2e

# E2Eテストを headed モードで実行
test-e2e-headed:
	npm run test:e2e:headed

# E2EテストをUIモードで実行
test-e2e-ui:
	npm run test:e2e:ui

# カバレッジレポートを生成
test-coverage:
	npm run test:coverage

# Lintチェックを実行
lint:
	npm run lint

# Lintの自動修正を実行
lint-fix:
	npm run lint:fix

# コードフォーマットを実行
format:
	npm run format

# フォーマットチェックを実行
format-check:
	npm run format:check

# TypeScriptの型チェックを実行
type-check:
	npm run type-check

# すべてのチェックを実行（CI用）
ci: lint type-check test

# アプリケーションをビルド
build:
	npm run build

# アプリケーションをビルド（インストーラーなし）
build-dir:
	npm run build:dir

# macOS用インストーラーをビルド
build-mac:
	npm run build:mac

# Windows用インストーラーをビルド
build-win:
	npm run build:win

# Linux用インストーラーをビルド
build-linux:
	npm run build:linux

# ビルド成果物を削除
clean:
	rm -rf dist dist-electron release node_modules/.vite

# 完全クリーン（node_modulesも削除）
clean-all: clean
	rm -rf node_modules

# リリースタグを作成してプッシュ
# 使い方: make release VERSION=v1.0.0
release:
	@if [ -z "$(VERSION)" ]; then \
		echo "エラー: VERSIONを指定してください"; \
		echo "使い方: make release VERSION=v1.0.0"; \
		exit 1; \
	fi
	@echo "リリースタグ $(VERSION) を作成します..."
	git tag -a $(VERSION) -m "Release $(VERSION)"
	git push origin $(VERSION)
	@echo "✓ タグ $(VERSION) がプッシュされました"
	@echo "GitHub Actionsでビルドとリリースが自動的に開始されます"

# リリースタグを削除（ローカルとリモート）
# 使い方: make delete-release VERSION=v1.0.0
delete-release:
	@if [ -z "$(VERSION)" ]; then \
		echo "エラー: VERSIONを指定してください"; \
		echo "使い方: make delete-release VERSION=v1.0.0"; \
		exit 1; \
	fi
	@echo "リリースタグ $(VERSION) を削除します..."
	git tag -d $(VERSION)
	git push origin :refs/tags/$(VERSION)
	@echo "✓ タグ $(VERSION) が削除されました"

# バージョン番号を確認
version:
	@echo "現在のバージョン:"
	@cat package.json | grep '"version"' | head -1 | awk -F: '{ print $$2 }' | sed 's/[",]//g' | xargs

# Gitタグの一覧を表示
tags:
	@echo "リリースタグ一覧:"
	@git tag -l "v*" --sort=-version:refname

# プロジェクト情報を表示
info:
	@echo "プロジェクト名: transcription-app"
	@echo "説明: Audio transcription and meeting minutes application"
	@echo "Node.js: $$(node --version)"
	@echo "npm: $$(npm --version)"
	@make version
