/**
 * WhisperLocalService テストスクリプト
 *
 * 使用方法:
 * ts-node scripts/test-whisper-local.ts
 */

import { ModelDownloadService, WHISPER_MODELS } from '../electron/services/whisper/model-download-service'

// app.getPath をモックする必要がある
const mockApp = {
  getPath: (name: string) => {
    if (name === 'userData') {
      return '/tmp/transcription-app-test'
    }
    return '/tmp'
  }
}

// Electronのappをモック
// eslint-disable-next-line @typescript-eslint/no-explicit-any
;(global as any).app = mockApp

async function testModelDownload() {
  console.log('=== Whisper Local Service Test ===\n')

  const service = new ModelDownloadService()

  console.log('Models directory:', service.getModelsDirectory())
  console.log('\nAvailable models:')
  Object.entries(WHISPER_MODELS).forEach(([key, model]) => {
    console.log(`  - ${key}: ${model.name} (${(model.size / 1024 / 1024).toFixed(2)} MB)`)
  })

  console.log('\nChecking if base model is downloaded...')
  const isDownloaded = service.isModelDownloaded('base')
  console.log(`Base model downloaded: ${isDownloaded}`)

  if (!isDownloaded) {
    console.log('\nDownloading base model...')
    try {
      const modelPath = await service.downloadModel('base', (progress) => {
        const percentage = progress.percentage.toFixed(1)
        const downloaded = (progress.downloaded / 1024 / 1024).toFixed(2)
        const total = (progress.total / 1024 / 1024).toFixed(2)
        process.stdout.write(`\rProgress: ${percentage}% (${downloaded}/${total} MB)`)
      })
      console.log(`\n✓ Model downloaded to: ${modelPath}`)
    } catch (error) {
      console.error('\n✗ Download failed:', error)
      process.exit(1)
    }
  }

  console.log('\nDownloaded models:', service.getDownloadedModels())
  console.log('\n=== Test completed ===')
}

testModelDownload().catch((error) => {
  console.error('Test failed:', error)
  process.exit(1)
})
