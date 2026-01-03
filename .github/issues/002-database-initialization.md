# [P0] データベース初期化とマイグレーション戦略の定義

## 問題の説明

データベーススキーマはClaude.md (セクション6)で定義されていますが、以下が未定義です：

1. データベースの初期化方法
2. マイグレーション戦略
3. アプリケーション起動時のDB作成フロー
4. スキーマバージョン管理方法

現在、`electron/services/database/migrations/`ディレクトリは空で、実装の指針がありません。

### 影響範囲

- データベース初期化コードが実装できない
- スキーマ変更時の対応方法が不明
- 既存ユーザーのデータマイグレーション方法が不明
- 開発環境とテスト環境でDB状態の再現性がない

## 期待される結果

1. データベース初期化SQLスクリプトの作成
2. マイグレーション戦略の文書化
3. バージョン管理機能の実装
4. アプリケーション起動時の自動DB初期化
5. マイグレーション実行機能の実装

## 実装提案

### 1. 初期スキーマSQL作成

`electron/services/database/migrations/001_initial_schema.sql`:
```sql
-- Schema version: 001
-- Phase: 1 (MVP)

CREATE TABLE IF NOT EXISTS schema_version (
  version INTEGER PRIMARY KEY,
  applied_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  description TEXT
);

CREATE TABLE IF NOT EXISTS projects (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  status TEXT DEFAULT 'pending',
  audio_file_path TEXT NOT NULL,
  audio_file_name TEXT NOT NULL,
  audio_file_size INTEGER,
  audio_duration REAL,
  audio_format TEXT
);

CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status);
CREATE INDEX IF NOT EXISTS idx_projects_created_at ON projects(created_at DESC);

CREATE TABLE IF NOT EXISTS transcriptions (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  content TEXT NOT NULL,
  language TEXT DEFAULT 'ja',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_transcriptions_project_id ON transcriptions(project_id);

CREATE TABLE IF NOT EXISTS segments (
  id TEXT PRIMARY KEY,
  transcription_id TEXT NOT NULL,
  start_time REAL NOT NULL,
  end_time REAL NOT NULL,
  text TEXT NOT NULL,
  speaker_id TEXT,
  confidence REAL,
  sequence_number INTEGER NOT NULL,
  FOREIGN KEY (transcription_id) REFERENCES transcriptions(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_segments_transcription_id ON segments(transcription_id);
CREATE INDEX IF NOT EXISTS idx_segments_sequence ON segments(transcription_id, sequence_number);

CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Insert initial schema version
INSERT INTO schema_version (version, description) VALUES (1, 'Initial schema - Phase 1 MVP');
```

### 2. DatabaseService実装

`electron/services/database/database-service.ts`:
```typescript
import Database from 'better-sqlite3'
import path from 'path'
import fs from 'fs'
import { app } from 'electron'

export class DatabaseService {
  private db: Database.Database | null = null
  private readonly dbPath: string

  constructor() {
    const userDataPath = app.getPath('userData')
    this.dbPath = path.join(userDataPath, 'transcription.db')
  }

  initialize(): void {
    // Create database
    this.db = new Database(this.dbPath)
    this.db.pragma('foreign_keys = ON')

    // Run migrations
    this.runMigrations()
  }

  private runMigrations(): void {
    const currentVersion = this.getCurrentSchemaVersion()
    const migrationsDir = path.join(__dirname, 'migrations')

    const migrationFiles = fs.readdirSync(migrationsDir)
      .filter(file => file.endsWith('.sql'))
      .sort()

    for (const file of migrationFiles) {
      const versionMatch = file.match(/^(\d+)_/)
      if (!versionMatch) continue

      const version = parseInt(versionMatch[1], 10)
      if (version <= currentVersion) continue

      console.log(`Applying migration: ${file}`)
      const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf-8')
      this.db!.exec(sql)
    }
  }

  private getCurrentSchemaVersion(): number {
    try {
      const row = this.db!.prepare(
        'SELECT MAX(version) as version FROM schema_version'
      ).get() as { version: number | null }
      return row?.version || 0
    } catch {
      return 0
    }
  }

  getDatabase(): Database.Database {
    if (!this.db) {
      throw new Error('Database not initialized')
    }
    return this.db
  }

  close(): void {
    if (this.db) {
      this.db.close()
      this.db = null
    }
  }
}

export const databaseService = new DatabaseService()
```

### 3. main.tsで初期化

`electron/main.ts`:
```typescript
import { databaseService } from './services/database/database-service'

app.whenReady().then(() => {
  // Initialize database
  try {
    databaseService.initialize()
    console.log('Database initialized successfully')
  } catch (error) {
    console.error('Failed to initialize database:', error)
    dialog.showErrorBox('Database Error', 'Failed to initialize database')
    app.quit()
    return
  }

  createWindow()
  // ...
})

app.on('quit', () => {
  databaseService.close()
})
```

### 4. マイグレーション戦略ドキュメント

`docs/database-migrations.md`:
```markdown
# データベースマイグレーション戦略

## 基本方針

1. すべてのスキーマ変更はマイグレーションファイルで管理
2. ファイル名は `{version}_{description}.sql` 形式
3. バージョンは連番で管理
4. 一度適用したマイグレーションは変更不可
5. ロールバックは新しいマイグレーションで対応

## マイグレーションファイルの作成

\`\`\`bash
# 例: Phase 2で話者テーブルを追加
002_add_speakers_table.sql
\`\`\`

## テスト環境での確認

\`\`\`bash
# テスト用DBで確認
npm run db:migrate:test
\`\`\`
```

## 受け入れ基準

- [ ] `001_initial_schema.sql`が作成されている
- [ ] `DatabaseService`クラスが実装されている
- [ ] アプリケーション起動時にDBが自動初期化される
- [ ] マイグレーション機能が動作する
- [ ] `schema_version`テーブルでバージョン管理できる
- [ ] マイグレーション戦略がドキュメント化されている
- [ ] 外部キー制約が有効になっている
- [ ] 適切なインデックスが作成されている

## ラベル

`priority:p0`, `type:enhancement`, `phase:1`

## マイルストーン

Phase 1 - MVP
