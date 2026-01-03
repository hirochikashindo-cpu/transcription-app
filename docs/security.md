# セキュリティドキュメント

最終更新: 2026-01-03

## 概要

このドキュメントでは、Transcription Appのセキュリティ対策とベストプラクティスについて説明します。

---

## 1. Electronセキュリティ設定

### 1.1 サンドボックスの有効化

**設定**: `electron/main.ts`

```typescript
webPreferences: {
  preload: path.join(__dirname, 'preload.js'),
  contextIsolation: true,
  nodeIntegration: false,
  sandbox: true  // ✅ 有効化済み
}
```

#### サンドボックスとは

Electronのサンドボックスは、レンダラープロセスを制限された環境で実行し、セキュリティを向上させる機能です。

**メリット**:
- レンダラープロセスがシステムリソースに直接アクセスできない
- XSS攻撃などの脆弱性が発見されても、被害を最小限に抑えられる
- Chromiumのセキュリティモデルに準拠

**制約**:
- レンダラープロセスでNode.jsネイティブモジュールを直接使用できない
- すべてのシステムアクセスはメインプロセス経由で行う必要がある

#### 互換性調査結果

**調査日**: 2026-01-03
**結果**: ✅ 互換性あり - サンドボックス有効化可能

このアプリケーションは、以下の理由によりサンドボックス環境で安全に動作します：

1. **ネイティブモジュールの配置**
   - `better-sqlite3`: メインプロセスで実行（`electron/services/database/`）
   - `fluent-ffmpeg`: メインプロセスで実行（将来実装予定）
   - レンダラープロセスではネイティブモジュールを直接使用していない

2. **Context Isolation**
   - `contextIsolation: true`により、レンダラーとメインプロセスが完全に分離
   - `contextBridge` APIを使用して、安全にAPIを公開

3. **IPC通信**
   - すべての通信は`ipcRenderer.invoke()`を使用
   - レンダラーから`ipcRenderer`オブジェクト自体は公開されていない

### 1.2 Context Isolation

**設定**: `contextIsolation: true`

レンダラープロセスのJavaScript環境とpreloadスクリプトの環境を分離します。

**実装**: `electron/preload.ts`

```typescript
contextBridge.exposeInMainWorld('electronAPI', {
  project: {
    create: (data) => ipcRenderer.invoke('project:create', data),
    findAll: (filter) => ipcRenderer.invoke('project:findAll', filter),
    // ...
  },
  // ...
})
```

**セキュリティポイント**:
- ✅ `ipcRenderer`オブジェクトを直接公開していない
- ✅ 必要最小限のAPIのみを公開
- ✅ TypeScriptで型安全性を確保

### 1.3 Node Integration

**設定**: `nodeIntegration: false`

レンダラープロセスでNode.js APIを無効化します。

**理由**:
- XSS攻撃でNode.js APIが悪用されるリスクを排除
- レンダラーは純粋なウェブコンテンツとして動作

---

## 2. API Keyの管理

### 2.1 暗号化ストレージ

**実装**: `electron/services/settings/keychain-service.ts`

API Keyは以下の方法で安全に保存されます：

1. **本番環境**: OSネイティブのキーチェーン
   - macOS: Keychain
   - Windows: Credential Vault
   - Linux: libsecret

2. **開発環境**: `.env`ファイル（Gitignore済み）

```typescript
export class KeychainService {
  saveApiKey(key: string, value: string): void {
    if (!safeStorage.isEncryptionAvailable()) {
      this.savePlainText(key, value)
      return
    }
    const encrypted = safeStorage.encryptString(value)
    // データベースに暗号化されたデータを保存
  }
}
```

**セキュリティポイント**:
- ✅ Electron `safeStorage` APIを使用
- ✅ OSレベルの暗号化
- ✅ 平文でのAPI Key保存を回避

### 2.2 環境変数

**開発環境**: `.env`

```bash
OPENAI_API_KEY=your_openai_api_key_here
ANTHROPIC_API_KEY=your_anthropic_api_key_here
```

**重要**:
- ✅ `.env`ファイルは`.gitignore`に含まれている
- ❌ API Keyをソースコードにハードコードしない
- ❌ API Keyをリポジトリにコミットしない

---

## 3. データベースセキュリティ

### 3.1 SQLインジェクション対策

**実装**: `electron/services/database/repositories/`

すべてのクエリでプリペアドステートメントを使用します。

```typescript
// ✅ 安全な実装
const stmt = this.db.prepare('SELECT * FROM projects WHERE id = ?')
const row = stmt.get(id)

// ❌ 危険な実装（使用禁止）
const row = this.db.exec(`SELECT * FROM projects WHERE id = '${id}'`)
```

**セキュリティポイント**:
- ✅ `better-sqlite3`のプリペアドステートメントを使用
- ✅ ユーザー入力を直接クエリに埋め込まない
- ✅ パラメータバインディングを常に使用

### 3.2 データベースアクセス制限

- データベースファイルはメインプロセスでのみアクセス
- レンダラープロセスからの直接アクセスは不可
- すべてのアクセスはIPC経由で制御

---

## 4. XSS対策

### 4.1 React自動エスケープ

Reactはデフォルトでユーザー入力を自動的にエスケープします。

```typescript
// ✅ 安全 - 自動エスケープ
<div>{userInput}</div>

// ❌ 危険 - 使用禁止
<div dangerouslySetInnerHTML={{ __html: userInput }} />
```

### 4.2 CSP（Content Security Policy）

**将来的な改善案**:

```typescript
// electron/main.ts
session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
  callback({
    responseHeaders: {
      ...details.responseHeaders,
      'Content-Security-Policy': [
        "default-src 'self'; script-src 'self'"
      ]
    }
  })
})
```

---

## 5. ファイルアクセス

### 5.1 パストラバーサル対策

**実装**: `electron/handlers/file-handlers.ts`

```typescript
import path from 'path'

// ファイルパスの検証
function validatePath(filePath: string): boolean {
  const resolved = path.resolve(filePath)
  // 許可されたディレクトリ内かチェック
  return resolved.startsWith(allowedDirectory)
}
```

**セキュリティポイント**:
- ユーザー指定のファイルパスを信頼しない
- パスの正規化と検証を行う
- 許可されたディレクトリ外へのアクセスを防ぐ

### 5.2 ファイルダイアログの使用

```typescript
// ✅ 安全 - Electronのダイアログを使用
const { filePaths } = await dialog.showOpenDialog({
  properties: ['openFile'],
  filters: [{ name: 'Audio', extensions: ['mp3', 'wav', 'm4a'] }]
})

// ❌ 危険 - ユーザー入力のパスを直接使用
const filePath = userInput // パストラバーサルのリスク
```

---

## 6. 外部API通信

### 6.1 HTTPS通信

すべての外部API通信はHTTPSを使用します。

```typescript
// OpenAI Whisper API
axios.post('https://api.openai.com/v1/audio/transcriptions', ...)

// Anthropic Claude API
axios.post('https://api.anthropic.com/v1/messages', ...)
```

### 6.2 API Keyの送信

- ✅ HTTPSヘッダーで送信
- ✅ リクエストボディには含めない（ログに残らない）
- ✅ URLパラメータには含めない

```typescript
headers: {
  'Authorization': `Bearer ${apiKey}`,
  'Content-Type': 'application/json'
}
```

---

## 7. ログとエラーハンドリング

### 7.1 機密情報のログ出力禁止

```typescript
// ✅ 安全
console.log('API key saved successfully')

// ❌ 危険 - API Keyをログに出力しない
console.log(`Saved API key: ${apiKey}`)
```

### 7.2 エラーメッセージ

```typescript
// ✅ 安全 - ユーザーフレンドリーなメッセージ
throw new Error('Failed to save API key')

// ❌ 危険 - 詳細な内部情報を公開しない
throw new Error(`Failed to save API key to ${internalPath}`)
```

---

## 8. 依存関係の管理

### 8.1 定期的な更新

```bash
# 脆弱性チェック
npm audit

# 脆弱性の自動修正
npm audit fix
```

### 8.2 信頼できるパッケージのみ使用

- ✅ 公式パッケージまたは広く使用されているパッケージ
- ✅ 定期的にメンテナンスされているパッケージ
- ❌ 長期間更新されていないパッケージ

---

## 9. セキュリティチェックリスト

開発・リリース前に以下を確認してください：

### 開発時
- [ ] `sandbox: true`が設定されている
- [ ] `contextIsolation: true`が設定されている
- [ ] `nodeIntegration: false`が設定されている
- [ ] API Keyが`.env`に記載されている
- [ ] `.env`が`.gitignore`に含まれている
- [ ] プリペアドステートメントを使用している
- [ ] `dangerouslySetInnerHTML`を使用していない

### リリース前
- [ ] `npm audit`でセキュリティ脆弱性をチェック
- [ ] すべての依存パッケージが最新版
- [ ] API Keyがハードコードされていない
- [ ] エラーメッセージに機密情報が含まれていない
- [ ] ログに機密情報が出力されていない

### 本番環境
- [ ] OSキーチェーンでAPI Keyを暗号化保存
- [ ] HTTPS通信のみ使用
- [ ] コード署名を実施（macOS/Windows）
- [ ] 公証を実施（macOS）

---

## 10. 既知の制限事項

### 10.1 ローカルストレージ

- データベースファイルはローカルに平文で保存される
- 文字起こしデータ自体は暗号化されていない
- **理由**: パフォーマンスとユーザビリティのバランス
- **推奨**: 機密性の高い音声の場合は、ディスク全体の暗号化（FileVault、BitLockerなど）を使用

### 10.2 メモリ上のデータ

- 処理中のデータはメモリ上に平文で存在
- プロセスダンプやメモリスキャンで読み取られる可能性
- **対策**: 処理完了後は速やかにメモリから削除

---

## 11. インシデント対応

### 11.1 脆弱性の報告

セキュリティ脆弱性を発見した場合：

1. **GitHub Security Advisories**を使用して報告
2. または、プロジェクトメンテナーに直接連絡
3. 公開Issue/PRでの報告は避ける（修正まで）

### 11.2 対応手順

1. 脆弱性の検証
2. 修正パッチの開発
3. セキュリティアップデートのリリース
4. ユーザーへの通知

---

## 12. 参考資料

- [Electron Security Best Practices](https://www.electronjs.org/docs/latest/tutorial/security)
- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Node.js Security Best Practices](https://nodejs.org/en/docs/guides/security/)
- [SQLite Security](https://www.sqlite.org/security.html)

---

**最終更新**: 2026-01-03
**バージョン**: 1.0
