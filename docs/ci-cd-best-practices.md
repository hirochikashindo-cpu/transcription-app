# CI/CDベストプラクティス

最終更新: 2026-01-03

## 概要

このドキュメントでは、Transcription AppのCI/CD運用における重要なポイントとベストプラクティスを説明します。

---

## 🚨 今後気をつけるべき5つのポイント

### 1. GitHub組織設定とコード署名証明書の事前確認

#### チェック項目

```bash
# GitHubリポジトリの設定確認
gh repo view hirochikashindo-cpu/transcription-app --json settings

# GitHub Actionsの権限確認
gh api repos/hirochikashindo-cpu/transcription-app/actions/permissions
```

#### 確認すべき設定

**GitHub Actions設定**:
- Workflow permissions: "Read and write permissions"
- Fork pull requestからのワークフロー実行可否

**コード署名（将来的に必要）**:
- macOS: Apple Developer ID証明書
- Windows: Code Signing証明書
- 証明書の有効期限管理

#### 理由

- GitHub Actionsの権限不足でリリース作成が失敗する
- コード署名証明書は取得に時間がかかる（特にApple公証）
- 後から発覚すると大幅な手戻りが発生

#### 対策

```bash
# GitHub Actionsの権限設定（リポジトリ設定で確認）
Settings → Actions → General → Workflow permissions
→ "Read and write permissions" を選択

# 将来的に必要なSecrets
# Settings → Secrets and variables → Actions
APPLE_ID                 # macOS公証用
APPLE_ID_PASSWORD        # macOS公証用（アプリ専用パスワード）
CSC_LINK                 # macOS/Windows証明書（base64エンコード）
CSC_KEY_PASSWORD         # 証明書パスワード
```

**プロジェクト開始時チェックリスト**:
- [ ] GitHub Actions権限が適切に設定されている
- [ ] 必要なSecretsが設定されている
- [ ] コード署名証明書の有効期限を確認（6ヶ月前に更新準備）

---

### 2. ビルド成果物のバージョンタグを一致させる

#### 問題のパターン

```yaml
# ❌ 悪い例
# package.jsonのバージョンとGitタグが不一致
package.json: "version": "1.0.0"
Git tag: v1.0.1  # 不一致！

# electron-builderが混乱してビルド失敗
```

#### 推奨パターン

```yaml
# ✅ 良い例
# 1. package.jsonのバージョンを更新
package.json: "version": "1.0.0"

# 2. 同じバージョンでGitタグを作成
git tag v1.0.0

# 3. electron-builderは自動的にpackage.jsonから読み取る
electron-builder --config.productVersion=1.0.0
```

#### 理由

- バージョン不一致でビルドエラーが発生
- ユーザーがダウンロードしたファイルのバージョンが不明確
- リリースノートとビルド成果物の対応が取れない

#### 対策

**Makefileを使用した一元管理**:

```bash
# package.jsonのバージョンを確認
make version

# リリースタグ作成（package.jsonのバージョンと一致させる）
# 事前にpackage.jsonのバージョンを手動更新
make release VERSION=v1.0.0
```

**自動化スクリプト（推奨）**:

```bash
#!/bin/bash
# scripts/release.sh

VERSION=$1
if [ -z "$VERSION" ]; then
  echo "Usage: ./scripts/release.sh v1.0.0"
  exit 1
fi

# package.jsonのバージョンを更新
npm version ${VERSION#v} --no-git-tag-version

# Git add, commit, tag
git add package.json package-lock.json
git commit -m "chore: Bump version to $VERSION"
git tag $VERSION
git push && git push --tags
```

**GitHub Actionsでの検証**:

```yaml
# .github/workflows/release.yml
- name: Verify version consistency
  run: |
    PACKAGE_VERSION=$(node -p "require('./package.json').version")
    TAG_VERSION=${GITHUB_REF#refs/tags/v}

    if [ "$PACKAGE_VERSION" != "$TAG_VERSION" ]; then
      echo "❌ Version mismatch!"
      echo "package.json: $PACKAGE_VERSION"
      echo "Git tag: $TAG_VERSION"
      exit 1
    fi
    echo "✅ Version consistent: $PACKAGE_VERSION"
```

---

### 3. GitHub Actions Secretsの権限を事前に設定

#### 必要なSecrets一覧

```bash
# GitHub Settings → Secrets and variables → Actions

# 基本（自動提供）
GITHUB_TOKEN              # GitHub Actions自動提供（設定不要）

# コード署名（将来的に必要）
APPLE_ID                  # Apple ID（macOS公証用）
APPLE_ID_PASSWORD         # アプリ専用パスワード
APPLE_TEAM_ID             # Apple Developer Team ID
CSC_LINK                  # 証明書ファイル（base64エンコード）
CSC_KEY_PASSWORD          # 証明書パスワード
WIN_CSC_LINK              # Windows証明書（base64）
WIN_CSC_KEY_PASSWORD      # Windows証明書パスワード

# 配布（将来的に必要）
SNAPCRAFT_TOKEN           # Linux Snap Store
APPLE_API_KEY             # App Store Connect API Key
APPLE_API_ISSUER          # App Store Connect Issuer ID
```

#### 証明書のbase64エンコード方法

```bash
# macOS証明書（.p12ファイル）
base64 -i certificate.p12 -o certificate.txt
# certificate.txtの内容をCSC_LINKにコピー

# Windows証明書（.pfxファイル）
base64 -i certificate.pfx -o certificate.txt
# certificate.txtの内容をWIN_CSC_LINKにコピー
```

#### 理由

- 権限不足で途中でビルド/デプロイ失敗すると時間の無駄
- エラーメッセージが曖昧な場合がある（特にコード署名関連）
- 証明書の有効期限切れで突然ビルドが失敗

#### 対策

**CI/CDセットアップ時のチェックリスト**:

```bash
# 1. GitHub Actionsの権限確認
gh api repos/hirochikashindo-cpu/transcription-app/actions/permissions

# 2. 必要なSecretsが設定されているか確認
gh secret list

# 3. ローカルでビルドテスト（証明書なし）
npm run build:dir

# 4. ローカルでコード署名ビルドテスト（証明書あり）
CSC_LINK=./cert.p12 CSC_KEY_PASSWORD=xxx npm run build:mac
```

**ドキュメント化**:

```markdown
# docs/release-guide.md

## リリース前チェックリスト

- [ ] GITHUB_TOKEN権限が適切
- [ ] コード署名証明書の有効期限確認（6ヶ月以上残っている）
- [ ] Apple IDのアプリ専用パスワードが有効
- [ ] ローカルビルドが成功する
- [ ] CIビルドが成功する
```

---

### 4. electron-builderの長時間ビルド処理

#### 問題のパターン

```yaml
# ❌ 悪い例
- name: Build
  run: npm run build  # タイムアウトで失敗する可能性
  timeout-minutes: 10  # electron-builderには短すぎる
```

#### 推奨パターン

```yaml
# ✅ 良い例
- name: Build Electron App
  run: npm run build
  timeout-minutes: 30  # electron-builderは時間がかかる

- name: Upload artifacts
  uses: actions/upload-artifact@v4
  if: always()  # ビルド失敗時もログをアップロード
  with:
    name: build-logs
    path: |
      dist/
      release/
      *.log
```

#### macOS/Windows/Linux別のビルド時間目安

| OS | ビルド時間 | 推奨timeout |
|----|-----------|-------------|
| macOS | 10-15分 | 30分 |
| Windows | 8-12分 | 25分 |
| Linux | 5-8分 | 20分 |

#### 並列ビルドの推奨構成

```yaml
# .github/workflows/release.yml
jobs:
  build:
    strategy:
      matrix:
        os: [macos-latest, windows-latest, ubuntu-latest]
    runs-on: ${{ matrix.os }}
    timeout-minutes: 30  # OSごとに個別タイムアウト

    steps:
      - name: Build
        run: |
          if [ "$RUNNER_OS" == "macOS" ]; then
            npm run build:mac
          elif [ "$RUNNER_OS" == "Windows" ]; then
            npm run build:win
          else
            npm run build:linux
          fi
```

#### 理由

- electron-builderはネイティブモジュール（better-sqlite3など）の再ビルドに時間がかかる
- macOSの公証（notarization）は特に時間がかかる（5-10分）
- タイムアウトで失敗すると、どこまで進んだか分からない

#### 対策

**タイムアウト設定**:

```yaml
# ジョブ全体のタイムアウト
timeout-minutes: 30

# 個別ステップのタイムアウト
- name: Build
  timeout-minutes: 25
  run: npm run build
```

**ビルドキャッシュの活用**:

```yaml
- name: Cache node modules
  uses: actions/cache@v4
  with:
    path: |
      ~/.npm
      node_modules
      ~/.cache/electron
      ~/.cache/electron-builder
    key: ${{ runner.os }}-build-${{ hashFiles('**/package-lock.json') }}
```

**ビルドログの保存**:

```yaml
- name: Upload build logs
  if: failure()  # ビルド失敗時のみ
  uses: actions/upload-artifact@v4
  with:
    name: build-logs-${{ matrix.os }}
    path: |
      *.log
      npm-debug.log
      electron-builder.log
```

---

### 5. CI/CDの状態を常にグリーンに保つ

#### 確認コマンド

```bash
# GitHub Actionsの実行履歴確認
gh run list --limit 5

# すべてグリーンであることを確認
# ✅ CI: SUCCESS
# ✅ Release: SUCCESS

# 特定のワークフロー確認
gh run list --workflow=ci.yml --limit 5
gh run list --workflow=release.yml --limit 5
```

#### 失敗時の対応フロー

```bash
# 1. 失敗原因の確認
gh run view <run-id>
gh run view <run-id> --log-failed

# 2. ローカルで再現
npm run lint
npm run type-check
npm run test
npm run build:dir

# 3. 修正してプッシュ
git add .
git commit -m "fix: CI failure - <原因>"
git push

# 4. 再度確認
gh run watch
```

#### 理由

- 壊れたCI/CDを放置すると、原因の特定が困難になる
- 問題を積み重ねると修正に膨大な時間がかかる
- 他の開発者がブロックされる

#### 対策

**原則を厳守**:

1. **CI/CDが失敗している状態では新規開発を行わない**
2. **PRマージ前に必ずCI/CDのグリーン確認**
3. **失敗したら即座に修正（他のタスクより優先）**

**自動化**:

```yaml
# .github/workflows/ci.yml
on:
  pull_request:
    branches: [main, develop]
  push:
    branches: [main, develop]

# PRには必須チェック
jobs:
  ci:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Install dependencies
        run: npm ci

      - name: Lint
        run: npm run lint

      - name: Type check
        run: npm run type-check

      - name: Test
        run: npm run test

      - name: Build (smoke test)
        run: npm run build:dir
```

**ブランチ保護ルール**:

```bash
# GitHub設定で有効化
Settings → Branches → Branch protection rules

main ブランチの保護:
✅ Require status checks to pass before merging
  ✅ CI workflow
  ✅ Type check
  ✅ Lint
  ✅ Tests
✅ Require branches to be up to date before merging
✅ Include administrators
```

**ローカルチェック（Husky）**:

```bash
# .husky/pre-commit
npm run lint
npm run type-check

# .husky/pre-push
npm run test
```

**定期的なメンテナンス**:

```yaml
# .github/workflows/dependencies.yml
# 週次で依存パッケージの更新確認
on:
  schedule:
    - cron: '0 0 * * 0'  # 毎週日曜日

jobs:
  update:
    runs-on: ubuntu-latest
    steps:
      - name: Check for updates
        run: npm outdated

      - name: Security audit
        run: npm audit
```

---

## CI/CD運用のベストプラクティス

### ワークフロー全体像

```
開発 → コミット → Push → CI実行 → PRレビュー → マージ → リリース
  ↓                  ↓                          ↓
Husky              Lint                      GitHub
hooks              Type check                Release
                   Test
                   Build check
```

### フェーズ別チェックリスト

#### 開発フェーズ

- [ ] ローカルでlint/type-check/testが通る
- [ ] Huskyフックが正常に動作している
- [ ] `.env`ファイルをコミットしていない

#### PRフェーズ

- [ ] CIが全てグリーン
- [ ] コンフリクトがない
- [ ] レビューが完了している

#### リリースフェーズ

- [ ] package.jsonのバージョンが更新されている
- [ ] CHANGELOGが更新されている（オプション）
- [ ] リリースタグがpackage.jsonと一致している
- [ ] ビルドが全プラットフォームで成功
- [ ] GitHub Releaseが正常に作成されている

---

## トラブルシューティング

### よくある問題と解決策

#### 1. "Image not found" エラー（electron-builder）

**原因**: ネイティブモジュールのビルド失敗

**解決策**:
```bash
# ネイティブモジュールの再ビルド
npm rebuild better-sqlite3 --build-from-source

# electron用に再ビルド
npx electron-rebuild

# キャッシュクリア
rm -rf node_modules
npm install
```

#### 2. コード署名エラー（macOS）

**原因**: 証明書の期限切れ、パスワード間違い

**解決策**:
```bash
# 証明書の確認
security find-identity -v -p codesigning

# Keychainの確認
open -a "Keychain Access"

# 証明書の有効期限確認
openssl pkcs12 -in certificate.p12 -nokeys -info
```

#### 3. GitHub Actions権限エラー

**原因**: GITHUB_TOKENの権限不足

**解決策**:
```yaml
# Settings → Actions → General → Workflow permissions
# "Read and write permissions" に変更

# または、workflowで明示的に権限付与
permissions:
  contents: write
  packages: write
```

#### 4. タイムアウトエラー

**原因**: ビルド時間が長すぎる

**解決策**:
```yaml
# timeout-minutesを延長
jobs:
  build:
    timeout-minutes: 30  # デフォルト360から変更
```

#### 5. better-sqlite3のビルドエラー

**原因**: Node.jsバージョン不一致

**解決策**:
```bash
# Node.jsバージョン確認
node --version

# package.jsonのenginesと一致させる
nvm use 20

# better-sqlite3再ビルド
npm rebuild better-sqlite3
```

---

## モニタリングとアラート

### GitHub Actionsの監視

```bash
# 定期的にCI/CDステータス確認
gh run list --limit 10

# 失敗しているワークフロー確認
gh run list --status failure

# 特定のブランチのステータス
gh run list --branch main
```

### 通知設定

GitHub Settingsで通知を有効化:
- Workflow failures
- Release published
- Security alerts

---

## まとめ

### CI/CDを成功させる5つの鉄則

1. ✅ **事前確認**: GitHub設定とSecrets
2. ✅ **バージョン一致**: package.json ⇔ Git tag
3. ✅ **権限設定**: 必要なSecretsを事前に設定
4. ✅ **タイムアウト**: electron-builderには十分な時間を確保
5. ✅ **常にグリーン**: CI/CD失敗を最優先で修正

### 定期的なメンテナンス

- **週次**: 依存パッケージの更新確認（`npm outdated`）
- **月次**: セキュリティ監査（`npm audit`）
- **四半期**: コード署名証明書の有効期限確認
- **年次**: GitHub Actions workflowの見直し

---

## 参考資料

- [GitHub Actions Documentation](https://docs.github.com/actions)
- [electron-builder Documentation](https://www.electron.build/)
- [Apple Notarization Guide](https://developer.apple.com/documentation/security/notarizing_macos_software_before_distribution)
- [Windows Code Signing](https://docs.microsoft.com/windows/win32/seccrypto/cryptography-tools)

---

**最終更新**: 2026-01-03
**バージョン**: 1.0
