# データベースマイグレーション戦略

## 概要

このアプリケーションでは、SQLiteデータベースのスキーマ管理にマイグレーションベースのアプローチを採用しています。すべてのスキーマ変更は、バージョン管理されたSQLファイルとして管理され、アプリケーション起動時に自動的に適用されます。

## 基本方針

1. **すべてのスキーマ変更はマイグレーションファイルで管理**
   - データベーススキーマの変更は、必ずマイグレーションファイルとして記録
   - 手動でのスキーマ変更は禁止

2. **ファイル名規則**: `{version}_{description}.sql`
   - `version`: 3桁のゼロパディング数値（例: 001, 002, 003）
   - `description`: 変更内容を表すスネークケースの説明（例: add_speakers_table）

3. **バージョンは連番で管理**
   - マイグレーションは順番に実行される
   - バージョン番号は連続していなければならない

4. **一度適用したマイグレーションは変更不可**
   - 既にリリースされたマイグレーションファイルは編集しない
   - 変更が必要な場合は、新しいマイグレーションを作成

5. **ロールバックは新しいマイグレーションで対応**
   - SQLiteにはロールバック機能がないため、新しいマイグレーションで対応
   - 例: `003_revert_speaker_name_change.sql`

## マイグレーションファイルの構造

### ディレクトリ構成

```
electron/services/database/
├── database-service.ts        # DatabaseServiceクラス
└── migrations/                # マイグレーションファイル格納ディレクトリ
    ├── 001_initial_schema.sql
    ├── 002_add_speakers_table.sql
    └── 003_add_custom_dictionaries.sql
```

### マイグレーションファイルのテンプレート

```sql
-- Schema version: XXX
-- Phase: N (説明)
-- Description: 変更内容の詳細説明

-- テーブル作成
CREATE TABLE IF NOT EXISTS table_name (
  id TEXT PRIMARY KEY,
  ...
);

-- インデックス作成
CREATE INDEX IF NOT EXISTS idx_table_column ON table_name(column);

-- schema_versionテーブルを更新
INSERT INTO schema_version (version, description)
VALUES (XXX, '変更内容の説明');
```

## マイグレーションの作成手順

### 1. ファイル作成

新しいマイグレーションファイルを作成します：

```bash
# 例: Phase 2で話者テーブルを追加
touch electron/services/database/migrations/002_add_speakers_table.sql
```

### 2. SQLの記述

マイグレーションファイルにSQLを記述します：

```sql
-- Schema version: 002
-- Phase: 2 (Extensions)
-- Description: Add speakers table for speaker recognition feature

CREATE TABLE IF NOT EXISTS speakers (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  name TEXT NOT NULL,
  custom_name TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_speakers_project_id ON speakers(project_id);

-- Update schema version
INSERT INTO schema_version (version, description)
VALUES (2, 'Add speakers table for Phase 2');
```

### 3. テスト

マイグレーションをテスト環境で確認します：

```bash
# アプリケーションを起動してマイグレーションをテスト
npm run dev

# ログでマイグレーション実行を確認
# Console: "Applying migration: 002_add_speakers_table.sql (v2)"
```

### 4. コミット

マイグレーションファイルをコミットします：

```bash
git add electron/services/database/migrations/002_add_speakers_table.sql
git commit -m "feat: add speakers table migration for Phase 2"
```

## マイグレーションの実行タイミング

### 自動実行

アプリケーション起動時に、`DatabaseService.initialize()`が呼ばれ、自動的にマイグレーションが実行されます。

```typescript
// electron/main.ts
app.whenReady().then(() => {
  databaseService.initialize() // ← ここでマイグレーションが実行される
  createWindow()
})
```

### 実行フロー

1. **現在のバージョン確認**
   - `schema_version`テーブルから最新バージョンを取得
   - テーブルが存在しない場合は、バージョン0とみなす

2. **マイグレーションファイルの読み込み**
   - `migrations/`ディレクトリから`.sql`ファイルを読み込み
   - ファイル名でソート（昇順）

3. **未適用マイグレーションの実行**
   - 各ファイルのバージョン番号を抽出
   - 現在のバージョンより大きいものを順番に実行

4. **エラーハンドリング**
   - マイグレーション失敗時はアプリケーションを終了
   - エラーダイアログを表示してユーザーに通知

## スキーマバージョン管理

### schema_versionテーブル

```sql
CREATE TABLE schema_version (
  version INTEGER PRIMARY KEY,
  applied_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  description TEXT NOT NULL
);
```

### バージョン履歴の確認

```sql
-- 全マイグレーション履歴を表示
SELECT * FROM schema_version ORDER BY version;

-- 例:
-- version | applied_at          | description
-- --------|---------------------|---------------------------
-- 1       | 2026-01-03 14:00:00 | Initial schema - Phase 1 MVP
-- 2       | 2026-02-01 10:00:00 | Add speakers table for Phase 2
```

## ベストプラクティス

### DO（推奨）

✅ **CREATE TABLE IF NOT EXISTS を使用**
```sql
CREATE TABLE IF NOT EXISTS projects (...);
```

✅ **CREATE INDEX IF NOT EXISTS を使用**
```sql
CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status);
```

✅ **外部キー制約を定義**
```sql
FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
```

✅ **適切なインデックスを作成**
```sql
-- よく検索されるカラムにインデックス
CREATE INDEX IF NOT EXISTS idx_projects_created_at ON projects(created_at DESC);
```

✅ **CHECK制約でデータ整合性を保証**
```sql
status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'processing', 'completed', 'failed'))
```

### DON'T（非推奨）

❌ **既存マイグレーションの編集**
```sql
-- ✗ 001_initial_schema.sql を後から編集してはいけない
-- ✓ 新しいマイグレーション（例: 002_fix_projects_table.sql）を作成
```

❌ **IF NOT EXISTSを省略**
```sql
-- ✗ 再実行時にエラーになる
CREATE TABLE projects (...);

-- ✓ 再実行可能
CREATE TABLE IF NOT EXISTS projects (...);
```

❌ **手動でのスキーマ変更**
```bash
# ✗ SQLiteで直接スキーマ変更
sqlite3 transcription.db "ALTER TABLE projects ADD COLUMN new_field TEXT;"

# ✓ マイグレーションファイルを作成
```

## トラブルシューティング

### マイグレーション失敗時の対処

1. **エラーログを確認**
   ```
   Console: "Failed to apply migration 002_add_speakers_table.sql: ..."
   ```

2. **データベースファイルを削除して再初期化**
   ```bash
   # macOS/Linux
   rm ~/Library/Application\ Support/transcription-app/transcription.db

   # Windows
   del %APPDATA%\transcription-app\transcription.db
   ```

3. **マイグレーションファイルを修正**
   - SQLの構文エラーを修正
   - アプリケーションを再起動

### マイグレーションのスキップ

特定のマイグレーションをスキップしたい場合（開発時のみ）：

```sql
-- 手動でバージョンを進める（開発時のみ！）
INSERT INTO schema_version (version, description)
VALUES (2, 'Manually skipped migration for testing');
```

⚠️ **警告**: 本番環境では絶対に行わないでください。

## 開発フェーズ別のマイグレーション

### Phase 1 (MVP)
- `001_initial_schema.sql` - 初期スキーマ（projects, transcriptions, segments, settings）

### Phase 2 (Extensions)
- `002_add_speakers_table.sql` - 話者認識機能
- `003_add_custom_dictionaries.sql` - カスタム辞書機能

### Phase 3 (AI Enhancement)
- `004_add_summaries_table.sql` - AI要約機能

## 参考資料

- [SQLite Documentation](https://www.sqlite.org/docs.html)
- [better-sqlite3 API](https://github.com/WiseLibs/better-sqlite3/blob/master/docs/api.md)
- [Database Migration Best Practices](https://www.prisma.io/dataguide/types/relational/what-are-database-migrations)

---

**最終更新**: 2026-01-03
**バージョン**: 1.0
