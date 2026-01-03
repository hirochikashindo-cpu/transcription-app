import { keychainService } from '../settings/keychain-service'
import * as dotenv from 'dotenv'

/**
 * ConfigService
 *
 * 環境別の設定管理を行うサービス
 * - 開発環境: .envファイルから読み込み
 * - 本番環境: OSキーチェーンから読み込み
 */
export class ConfigService {
  private config: Map<string, string> = new Map()
  private initialized = false

  /**
   * 設定を初期化
   * アプリ起動時に一度だけ呼び出す
   */
  initialize(): void {
    if (this.initialized) {
      console.warn('ConfigService is already initialized')
      return
    }

    // 開発環境では.envファイルから読み込み
    if (process.env.NODE_ENV === 'development') {
      console.log('Running in development mode, loading from .env file')
      dotenv.config()

      // .envファイルからAPI Keyを読み込み
      const openaiKey = process.env.OPENAI_API_KEY
      if (openaiKey) {
        this.config.set('OPENAI_API_KEY', openaiKey)
      }

      const anthropicKey = process.env.ANTHROPIC_API_KEY
      if (anthropicKey) {
        this.config.set('ANTHROPIC_API_KEY', anthropicKey)
      }
    } else {
      // 本番環境ではOSキーチェーンから読み込み
      console.log('Running in production mode, loading from OS keychain')

      const openaiKey = keychainService.getApiKey('OPENAI_API_KEY')
      if (openaiKey) {
        this.config.set('OPENAI_API_KEY', openaiKey)
      }

      const anthropicKey = keychainService.getApiKey('ANTHROPIC_API_KEY')
      if (anthropicKey) {
        this.config.set('ANTHROPIC_API_KEY', anthropicKey)
      }
    }

    this.initialized = true
  }

  /**
   * 設定値を取得
   *
   * @param key - 取得するキー名
   * @returns 設定値、または存在しない場合はundefined
   */
  get(key: string): string | undefined {
    if (!this.initialized) {
      console.warn('ConfigService is not initialized, initializing now')
      this.initialize()
    }

    return this.config.get(key)
  }

  /**
   * 設定値を設定（ランタイム時の動的更新用）
   *
   * @param key - 設定するキー名
   * @param value - 設定する値
   */
  set(key: string, value: string): void {
    this.config.set(key, value)
  }

  /**
   * API Keyが設定されているかチェック
   *
   * @param key - チェックするキー名
   * @returns API Keyが設定されている場合true
   */
  has(key: string): boolean {
    if (!this.initialized) {
      this.initialize()
    }

    const value = this.config.get(key)
    return !!value && value.length > 0
  }

  /**
   * すべての設定をクリア（テスト用）
   */
  clear(): void {
    this.config.clear()
    this.initialized = false
  }

  /**
   * OSキーチェーンから設定を再読み込み
   * 設定画面でAPI Keyを更新した後に呼び出す
   */
  reload(): void {
    this.config.clear()
    this.initialized = false
    this.initialize()
  }
}

export const configService = new ConfigService()
