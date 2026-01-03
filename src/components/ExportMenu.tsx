import { useState } from 'react'
import './ExportMenu.css'

interface ExportMenuProps {
  projectId: string
  disabled?: boolean
}

export function ExportMenu({ projectId, disabled = false }: ExportMenuProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [isExporting, setIsExporting] = useState(false)

  const handleExport = async (format: 'json' | 'markdown') => {
    setIsExporting(true)
    setIsOpen(false)

    try {
      if (format === 'json') {
        await window.electronAPI.export.toJson(projectId)
      } else {
        await window.electronAPI.export.toMarkdown(projectId)
      }
      // エクスポート成功（ファイルダイアログでユーザーが保存した）
    } catch (error) {
      console.error('Export failed:', error)
      alert('エクスポートに失敗しました')
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <div className="export-menu">
      <button
        className="btn-primary export-btn"
        onClick={() => setIsOpen(!isOpen)}
        disabled={disabled || isExporting}
      >
        <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
          <path
            fillRule="evenodd"
            d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z"
            clipRule="evenodd"
          />
        </svg>
        {isExporting ? 'エクスポート中...' : 'エクスポート'}
      </button>

      {isOpen && !disabled && (
        <>
          <div className="export-menu-backdrop" onClick={() => setIsOpen(false)} />
          <div className="export-menu-dropdown">
            <button
              className="export-option"
              onClick={() => handleExport('json')}
            >
              <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                <path
                  fillRule="evenodd"
                  d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z"
                  clipRule="evenodd"
                />
              </svg>
              <div className="export-option-text">
                <span className="export-option-title">JSON形式</span>
                <span className="export-option-desc">完全なデータ構造</span>
              </div>
            </button>

            <button
              className="export-option"
              onClick={() => handleExport('markdown')}
            >
              <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                <path
                  fillRule="evenodd"
                  d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z"
                  clipRule="evenodd"
                />
              </svg>
              <div className="export-option-text">
                <span className="export-option-title">Markdown形式</span>
                <span className="export-option-desc">読みやすい議事録形式</span>
              </div>
            </button>
          </div>
        </>
      )}
    </div>
  )
}
