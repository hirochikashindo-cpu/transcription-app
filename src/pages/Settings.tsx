import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import './Settings.css'

export function Settings() {
  const navigate = useNavigate()
  const [openaiKey, setOpenaiKey] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isEncryptionAvailable, setIsEncryptionAvailable] = useState(false)
  const [hasExistingKey, setHasExistingKey] = useState(false)

  useEffect(() => {
    loadSettings()
  }, [])

  const loadSettings = async () => {
    setIsLoading(true)
    setError(null)

    try {
      // 暗号化が利用可能かチェック
      const encryptionAvailable = await window.electronAPI.settings.isEncryptionAvailable()
      setIsEncryptionAvailable(encryptionAvailable)

      // 既存のAPI Keyを取得
      const key = await window.electronAPI.settings.get('OPENAI_API_KEY')

      if (key && typeof key === 'string') {
        setHasExistingKey(true)
        // セキュリティのため、最初の4文字と最後の4文字のみ表示
        if (key.length > 8) {
          const masked = `${key.slice(0, 4)}${'*'.repeat(Math.max(key.length - 8, 10))}${key.slice(-4)}`
          setOpenaiKey(masked)
        } else {
          setOpenaiKey('*'.repeat(key.length))
        }
      }
    } catch (err) {
      console.error('Failed to load settings:', err)
      setError('設定の読み込みに失敗しました')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSave = async () => {
    if (!openaiKey || openaiKey.trim().length === 0) {
      setError('API Keyを入力してください')
      return
    }

    // マスクされた値の場合は保存しない
    if (openaiKey.includes('*')) {
      setError('新しいAPI Keyを入力してください')
      return
    }

    setIsSaving(true)
    setError(null)
    setSaved(false)

    try {
      await window.electronAPI.settings.set('OPENAI_API_KEY', openaiKey)
      setSaved(true)
      setHasExistingKey(true)

      // 3秒後に成功メッセージを消す
      setTimeout(() => {
        setSaved(false)
        // API Keyをマスク表示に戻す
        loadSettings()
      }, 3000)
    } catch (err) {
      console.error('Failed to save settings:', err)
      setError(err instanceof Error ? err.message : '設定の保存に失敗しました')
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!window.confirm('API Keyを削除してもよろしいですか？')) {
      return
    }

    setIsSaving(true)
    setError(null)

    try {
      await window.electronAPI.settings.delete('OPENAI_API_KEY')
      setOpenaiKey('')
      setHasExistingKey(false)
      setSaved(false)
    } catch (err) {
      console.error('Failed to delete settings:', err)
      setError('設定の削除に失敗しました')
    } finally {
      setIsSaving(false)
    }
  }

  const handleInputChange = (value: string) => {
    setOpenaiKey(value)
    setError(null)
    setSaved(false)
  }

  if (isLoading) {
    return (
      <div className="settings-page">
        <div className="loading-container">
          <div className="spinner"></div>
          <p>読み込み中...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="settings-page">
      <header className="settings-header">
        <button className="btn-back" onClick={() => navigate('/')}>
          <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
            <path
              fillRule="evenodd"
              d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z"
              clipRule="evenodd"
            />
          </svg>
          戻る
        </button>

        <h1>設定</h1>
      </header>

      <div className="settings-content">
        <section className="settings-section">
          <h2>API Keys</h2>

          {!isEncryptionAvailable && (
            <div className="warning-banner">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                <path
                  fillRule="evenodd"
                  d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                  clipRule="evenodd"
                />
              </svg>
              <div>
                <strong>暗号化が利用できません</strong>
                <p>
                  お使いの環境では暗号化ストレージが利用できないため、API
                  Keyは平文で保存されます。本番環境では暗号化が有効になります。
                </p>
              </div>
            </div>
          )}

          <div className="form-group">
            <label htmlFor="openai-key">
              OpenAI API Key
              <span className="required">*</span>
            </label>
            <input
              id="openai-key"
              type="password"
              className="form-input"
              value={openaiKey}
              onChange={(e) => handleInputChange(e.target.value)}
              placeholder="sk-..."
              disabled={isSaving}
            />
            <small className="form-hint">
              {isEncryptionAvailable
                ? 'API Keyは暗号化されて安全に保存されます'
                : 'API Keyは平文で保存されます（開発環境のみ）'}
            </small>
          </div>

          {error && (
            <div className="error-message">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                  clipRule="evenodd"
                />
              </svg>
              {error}
            </div>
          )}

          {saved && (
            <div className="success-message">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                  clipRule="evenodd"
                />
              </svg>
              保存しました
            </div>
          )}

          <div className="button-group">
            <button
              className="btn-primary"
              onClick={handleSave}
              disabled={isSaving || !openaiKey || openaiKey.includes('*')}
            >
              {isSaving ? '保存中...' : '保存'}
            </button>

            {hasExistingKey && (
              <button className="btn-danger" onClick={handleDelete} disabled={isSaving}>
                削除
              </button>
            )}
          </div>
        </section>

        <section className="settings-section">
          <h2>セキュリティ情報</h2>

          <div className="info-grid">
            <div className="info-item">
              <span className="info-label">暗号化ストレージ</span>
              <span className={`info-value ${isEncryptionAvailable ? 'success' : 'warning'}`}>
                {isEncryptionAvailable ? '利用可能' : '利用不可'}
              </span>
            </div>

            <div className="info-item">
              <span className="info-label">保存方法</span>
              <span className="info-value">
                {isEncryptionAvailable ? 'OSキーチェーン（暗号化）' : 'データベース（平文）'}
              </span>
            </div>

            <div className="info-item">
              <span className="info-label">API Keyステータス</span>
              <span className={`info-value ${hasExistingKey ? 'success' : 'warning'}`}>
                {hasExistingKey ? '設定済み' : '未設定'}
              </span>
            </div>
          </div>

          <div className="security-note">
            <h3>セキュリティに関する注意</h3>
            <ul>
              <li>API Keyは他人と共有しないでください</li>
              <li>定期的にAPI Keyをローテーションすることを推奨します</li>
              <li>不要になったAPI Keyは削除してください</li>
              <li>
                本番環境では、OSのキーチェーン（macOS Keychain、Windows DPAPI、Linux
                libsecret）を使用して暗号化されます
              </li>
            </ul>
          </div>
        </section>
      </div>
    </div>
  )
}
