import { execSync } from 'child_process'
import { dialog, BrowserWindow } from 'electron'

/**
 * FFmpegがシステムにインストールされているかチェック
 */
export function checkFFmpegInstalled(): boolean {
  try {
    execSync('ffmpeg -version', { stdio: 'ignore' })
    return true
  } catch (error) {
    return false
  }
}

/**
 * FFmpegが見つからない場合のエラーダイアログを表示
 */
export function showFFmpegError(window?: BrowserWindow): void {
  const message =
    'FFmpeg is required but not installed.\n\n' +
    'Please install FFmpeg:\n' +
    'macOS: brew install ffmpeg\n' +
    'Windows: https://ffmpeg.org/download.html\n' +
    'Linux: sudo apt-get install ffmpeg\n\n' +
    'After installation, restart the application.'

  if (window) {
    dialog.showMessageBox(window, {
      type: 'error',
      title: 'FFmpeg Not Found',
      message: 'FFmpeg Not Found',
      detail: message,
      buttons: ['OK'],
    })
  } else {
    dialog.showErrorBox('FFmpeg Not Found', message)
  }
}

/**
 * FFmpegのバージョン情報を取得
 */
export function getFFmpegVersion(): string | null {
  try {
    const output = execSync('ffmpeg -version', { encoding: 'utf8' })
    const match = output.match(/ffmpeg version ([\d.]+)/)
    return match ? match[1] : null
  } catch (error) {
    return null
  }
}
