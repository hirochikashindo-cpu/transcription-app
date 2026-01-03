import Database from 'better-sqlite3'
import path from 'path'
import fs from 'fs'
import { app } from 'electron'

/**
 * DatabaseService
 *
 * アプリケーションのSQLiteデータベースを管理するサービス
 * - データベースの初期化
 * - マイグレーションの実行
 * - データベースインスタンスの提供
 */
export class DatabaseService {
  private db: Database.Database | null = null
  private readonly dbPath: string

  constructor() {
    // ユーザーデータディレクトリにデータベースを配置
    const userDataPath = app.getPath('userData')
    this.dbPath = path.join(userDataPath, 'transcription.db')
    console.log(`Database path: ${this.dbPath}`)
  }

  /**
   * データベースを初期化
   * - データベースファイルを作成
   * - 外部キー制約を有効化
   * - マイグレーションを実行
   */
  initialize(): void {
    console.log('Initializing database...')

    // データベースを開く（存在しない場合は作成される）
    this.db = new Database(this.dbPath)

    // 外部キー制約を有効化
    this.db.pragma('foreign_keys = ON')

    // マイグレーションを実行
    this.runMigrations()

    console.log('Database initialized successfully')
  }

  /**
   * マイグレーションを実行
   * - migrationsディレクトリ内のSQLファイルを順番に実行
   * - 既に適用済みのマイグレーションはスキップ
   */
  private runMigrations(): void {
    const currentVersion = this.getCurrentSchemaVersion()
    console.log(`Current schema version: ${currentVersion}`)

    // 開発環境と本番環境でパスが異なる
    let migrationsDir = path.join(__dirname, 'migrations')

    // 開発環境の場合、元のソースディレクトリからmigrationsを読み込む
    if (!fs.existsSync(migrationsDir)) {
      migrationsDir = path.join(__dirname, '..', 'electron', 'services', 'database', 'migrations')
    }

    // マイグレーションディレクトリが存在しない場合はエラー
    if (!fs.existsSync(migrationsDir)) {
      throw new Error(`Migrations directory not found: ${migrationsDir}`)
    }

    // マイグレーションファイルを読み込み
    const migrationFiles = fs
      .readdirSync(migrationsDir)
      .filter((file) => file.endsWith('.sql'))
      .sort()

    console.log(`Found ${migrationFiles.length} migration files`)

    // 各マイグレーションファイルを処理
    for (const file of migrationFiles) {
      const versionMatch = file.match(/^(\d+)_/)
      if (!versionMatch) {
        console.warn(`Skipping invalid migration file: ${file}`)
        continue
      }

      const version = parseInt(versionMatch[1], 10)

      // 既に適用済みの場合はスキップ
      if (version <= currentVersion) {
        console.log(`Skipping already applied migration: ${file} (v${version})`)
        continue
      }

      // マイグレーションを適用
      console.log(`Applying migration: ${file} (v${version})`)
      const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf-8')

      try {
        this.db!.exec(sql)
        console.log(`Successfully applied migration: ${file}`)
      } catch (error) {
        console.error(`Failed to apply migration ${file}:`, error)
        throw new Error(`Migration failed: ${file}`)
      }
    }

    const newVersion = this.getCurrentSchemaVersion()
    console.log(`Schema updated to version: ${newVersion}`)
  }

  /**
   * 現在のスキーマバージョンを取得
   * @returns 現在のバージョン番号（テーブルが存在しない場合は0）
   */
  private getCurrentSchemaVersion(): number {
    try {
      const row = this.db!.prepare('SELECT MAX(version) as version FROM schema_version').get() as {
        version: number | null
      }
      return row?.version || 0
    } catch (error) {
      // schema_versionテーブルが存在しない場合（初回実行時）
      return 0
    }
  }

  /**
   * データベースインスタンスを取得
   * @returns データベースインスタンス
   * @throws データベースが初期化されていない場合はエラー
   */
  getDatabase(): Database.Database {
    if (!this.db) {
      throw new Error('Database not initialized. Call initialize() first.')
    }
    return this.db
  }

  /**
   * データベースを閉じる
   * アプリケーション終了時に呼び出す
   */
  close(): void {
    if (this.db) {
      console.log('Closing database...')
      this.db.close()
      this.db = null
      console.log('Database closed')
    }
  }

  /**
   * データベースパスを取得
   * @returns データベースファイルのパス
   */
  getDatabasePath(): string {
    return this.dbPath
  }

  /**
   * データベースが初期化済みかチェック
   * @returns 初期化済みの場合true
   */
  isInitialized(): boolean {
    return this.db !== null
  }
}

// シングルトンインスタンスをエクスポート
export const databaseService = new DatabaseService()
