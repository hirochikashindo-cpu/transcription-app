import { useState } from 'react'
import './FileUpload.css'

interface FileUploadProps {
  onFileSelected: (filePath: string) => void
  disabled?: boolean
}

export function FileUpload({ onFileSelected, disabled = false }: FileUploadProps) {
  const [selectedFile, setSelectedFile] = useState<string | null>(null)
  const [isValidating, setIsValidating] = useState(false)
  const [validationError, setValidationError] = useState<string | null>(null)

  const handleSelectFile = async () => {
    setValidationError(null)
    setIsValidating(true)

    try {
      const filePath = await window.electronAPI.file.select()

      if (!filePath) {
        setIsValidating(false)
        return
      }

      // ファイルを検証
      const validation = await window.electronAPI.file.validate(filePath)

      if (!validation.valid) {
        setValidationError(validation.error || 'ファイルが無効です')
        setSelectedFile(null)
        setIsValidating(false)
        return
      }

      setSelectedFile(filePath)
      onFileSelected(filePath)
    } catch (error) {
      setValidationError(error instanceof Error ? error.message : 'ファイル選択に失敗しました')
      setSelectedFile(null)
    } finally {
      setIsValidating(false)
    }
  }

  const getFileName = (path: string) => {
    return path.split('/').pop() || path
  }

  return (
    <div className="file-upload">
      <button
        className="btn-primary file-upload-btn"
        onClick={handleSelectFile}
        disabled={disabled || isValidating}
      >
        {isValidating ? '確認中...' : '音声ファイルを選択'}
      </button>

      {selectedFile && (
        <div className="file-upload-selected">
          <svg className="file-icon" width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
            <path d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" />
          </svg>
          <span className="file-name">{getFileName(selectedFile)}</span>
        </div>
      )}

      {validationError && (
        <div className="file-upload-error">
          <svg
            className="error-icon"
            width="16"
            height="16"
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
              clipRule="evenodd"
            />
          </svg>
          <span>{validationError}</span>
        </div>
      )}
    </div>
  )
}
