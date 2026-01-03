# [P1] API Key管理のセキュリティ強化

## 問題の説明

現在、API Keyは`.env`ファイルで管理されていますが、これはセキュリティベストプラクティスに反します：

- Claude.md (セクション4.2)で「環境変数またはOSキーチェーンに保存」と記載
- しかし、OSキーチェーン統合が未実装
- `.env`ファイルベースの管理は開発環境のみに適している
- 本番環境（配布されたアプリ）でのAPI Key保存方法が未定義

### 影響範囲

- API Keyが平文で保存される可能性（セキュリティリスク）
- ユーザーの認証情報が漏洩する可能性
- SOC 2/GDPR などのコンプライアンス要件を満たせない

## 期待される結果

1. ElectronのsafeStorage APIを使ったOSキーチェーン統合
2. API Keyの暗号化保存
3. 設定画面からAPI Keyを安全に入力できるUI
4. 開発環境では`.env`、本番環境ではOSキーチェーンを使用

## 実装提案

### 1. KeychainServiceの実装

`electron/services/settings/keychain-service.ts`:
```typescript
import { safeStorage } from 'electron'
import { databaseService } from '../database/database-service'

interface EncryptedSetting {
  key: string
  encrypted_value: Buffer
}

export class KeychainService {
  /**
   * API Keyを安全に保存
   */
  saveApiKey(key: string, value: string): void {
    if (!safeStorage.isEncryptionAvailable()) {
      console.warn('Encryption not available, falling back to plain text storage')
      this.savePlainText(key, value)
      return
    }

    const encrypted = safeStorage.encryptString(value)
    const db = databaseService.getDatabase()

    db.prepare(
      `INSERT OR REPLACE INTO settings (key, value, updated_at)
       VALUES (?, ?, datetime('now'))`
    ).run(key, encrypted.toString('base64'))
  }

  /**
   * API Keyを取得
   */
  getApiKey(key: string): string | null {
    const db = databaseService.getDatabase()
    const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(key) as {
      value: string
    } | undefined

    if (!row) return null

    if (!safeStorage.isEncryptionAvailable()) {
      return row.value
    }

    try {
      const encrypted = Buffer.from(row.value, 'base64')
      return safeStorage.decryptString(encrypted)
    } catch (error) {
      console.error('Failed to decrypt API key:', error)
      return null
    }
  }

  /**
   * 開発環境用のフォールバック
   */
  private savePlainText(key: string, value: string): void {
    const db = databaseService.getDatabase()
    db.prepare(
      `INSERT OR REPLACE INTO settings (key, value, updated_at)
       VALUES (?, ?, datetime('now'))`
    ).run(key, value)
  }

  /**
   * API Keyを削除
   */
  deleteApiKey(key: string): void {
    const db = databaseService.getDatabase()
    db.prepare('DELETE FROM settings WHERE key = ?').run(key)
  }

  /**
   * すべてのAPI Keyを削除（リセット用）
   */
  clearAllApiKeys(): void {
    const db = databaseService.getDatabase()
    db.prepare("DELETE FROM settings WHERE key LIKE '%_API_KEY'").run()
  }
}

export const keychainService = new KeychainService()
```

### 2. IPC Handlerの追加

`electron/ipc/settings-handler.ts`:
```typescript
import { ipcMain } from 'electron'
import { keychainService } from '../services/settings/keychain-service'

export function registerSettingsHandlers() {
  ipcMain.handle('settings:get', async (_event, key: string) => {
    return keychainService.getApiKey(key)
  })

  ipcMain.handle('settings:set', async (_event, key: string, value: string) => {
    keychainService.saveApiKey(key, value)
  })

  ipcMain.handle('settings:delete', async (_event, key: string) => {
    keychainService.deleteApiKey(key)
  })
}
```

### 3. 設定画面UIの実装

`src/pages/SettingsPage.tsx`:
```typescript
import { useState } from 'react'

export function SettingsPage() {
  const [openaiKey, setOpenaiKey] = useState('')
  const [saved, setSaved] = useState(false)

  const loadSettings = async () => {
    const key = await window.electronAPI.settings.get('OPENAI_API_KEY')
    if (key) {
      // セキュリティのため、最初の4文字と最後の4文字のみ表示
      const masked = `${key.slice(0, 4)}${'*'.repeat(key.length - 8)}${key.slice(-4)}`
      setOpenaiKey(masked)
    }
  }

  const saveSettings = async () => {
    if (openaiKey && !openaiKey.includes('*')) {
      await window.electronAPI.settings.set('OPENAI_API_KEY', openaiKey)
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    }
  }

  return (
    <div className="settings-page">
      <h1>設定</h1>

      <section>
        <h2>API Keys</h2>
        <div className="form-group">
          <label>OpenAI API Key</label>
          <input
            type="password"
            value={openaiKey}
            onChange={(e) => setOpenaiKey(e.target.value)}
            placeholder="sk-..."
          />
          <small>API Keyは暗号化されて安全に保存されます</small>
        </div>

        <button onClick={saveSettings}>保存</button>
        {saved && <span className="success">✓ 保存しました</span>}
      </section>
    </div>
  )
}
```

### 4. 環境別の設定読み込み

`electron/services/config/config-service.ts`:
```typescript
import { keychainService } from '../settings/keychain-service'
import * as dotenv from 'dotenv'

export class ConfigService {
  private config: Map<string, string> = new Map()

  initialize() {
    // 開発環境では.envファイルから読み込み
    if (process.env.NODE_ENV === 'development') {
      dotenv.config()
      this.config.set('OPENAI_API_KEY', process.env.OPENAI_API_KEY || '')
    } else {
      // 本番環境ではOSキーチェーンから読み込み
      const openaiKey = keychainService.getApiKey('OPENAI_API_KEY')
      if (openaiKey) {
        this.config.set('OPENAI_API_KEY', openaiKey)
      }
    }
  }

  get(key: string): string | undefined {
    return this.config.get(key)
  }
}

export const configService = new ConfigService()
```

## セキュリティ考慮事項

1. **暗号化アルゴリズム**:
   - macOS: Keychain Services
   - Windows: DPAPI (Data Protection API)
   - Linux: libsecret

2. **API Keyのマスキング**:
   - UIでは常にマスク表示
   - ログには絶対に出力しない

3. **アクセス制御**:
   - Renderer Processから直接アクセス不可
   - IPC経由でのみアクセス

## 受け入れ基準

- [ ] KeychainServiceが実装されている
- [ ] safeStorage APIを使用してAPI Keyを暗号化保存
- [ ] 設定画面からAPI Keyを入力・保存できる
- [ ] API Keyはマスク表示される
- [ ] 開発環境では.env、本番環境ではOSキーチェーンを使用
- [ ] セキュリティドキュメントに記載されている
- [ ] ログにAPI Keyが出力されないことを確認

## ラベル

`priority:p1`, `type:security`, `type:enhancement`, `phase:1`

## マイルストーン

Phase 1 - MVP
