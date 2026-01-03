import { create } from 'zustand'
import type { TranscriptionProgress } from '@shared/types/electron'

interface TranscriptionState {
  currentProgress: TranscriptionProgress | null
  isTranscribing: boolean

  // Actions
  startTranscription: (filePath: string, projectId: string) => Promise<void>
  setProgress: (progress: TranscriptionProgress) => void
  clearProgress: () => void
}

export const useTranscriptionStore = create<TranscriptionState>((set) => ({
  currentProgress: null,
  isTranscribing: false,

  startTranscription: async (filePath: string, projectId: string) => {
    set({ isTranscribing: true, currentProgress: null })

    // Progress監視を設定
    const unsubscribe = window.electronAPI.transcription.onProgress((progress) => {
      set({ currentProgress: progress })

      if (progress.status === 'completed' || progress.status === 'failed') {
        set({ isTranscribing: false })
        unsubscribe()
      }
    })

    try {
      await window.electronAPI.transcription.start(filePath, projectId)
    } catch (error) {
      set({
        isTranscribing: false,
        currentProgress: {
          projectId,
          status: 'failed',
          progress: 0,
          error: error instanceof Error ? error.message : 'Transcription failed'
        }
      })
      unsubscribe()
      throw error
    }
  },

  setProgress: (progress: TranscriptionProgress) => {
    set({ currentProgress: progress })
  },

  clearProgress: () => {
    set({ currentProgress: null, isTranscribing: false })
  },
}))
