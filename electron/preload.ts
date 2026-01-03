import { contextBridge, ipcRenderer, IpcRendererEvent } from 'electron'
import type {
  CreateProjectData,
  ProjectFilter,
  UpdateProjectData,
  TranscriptionProgress,
  SettingValue,
  ElectronAPI,
} from '@shared/types/electron'

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld(
  'electronAPI',
  {
    // Example API
    ping: () => ipcRenderer.invoke('ping'),

    // Project APIs
    project: {
      create: (data: CreateProjectData) => ipcRenderer.invoke('project:create', data),
      findAll: (filter?: ProjectFilter) => ipcRenderer.invoke('project:findAll', filter),
      findById: (id: string) => ipcRenderer.invoke('project:findById', id),
      update: (id: string, updates: UpdateProjectData) =>
        ipcRenderer.invoke('project:update', id, updates),
      delete: (id: string) => ipcRenderer.invoke('project:delete', id),
    },

    // Transcription APIs
    transcription: {
      start: (filePath: string, projectId: string) =>
        ipcRenderer.invoke('transcription:start', filePath, projectId),
      getByProjectId: (projectId: string) =>
        ipcRenderer.invoke('transcription:getByProjectId', projectId),
      updateSegment: (segmentId: string, text: string) =>
        ipcRenderer.invoke('transcription:updateSegment', segmentId, text),
      onProgress: (callback: (progress: TranscriptionProgress) => void) => {
        const subscription = (_event: IpcRendererEvent, progress: TranscriptionProgress) =>
          callback(progress)
        ipcRenderer.on('transcription:progress', subscription)
        return () => ipcRenderer.removeListener('transcription:progress', subscription)
      },
    },

    // File APIs
    file: {
      select: () => ipcRenderer.invoke('file:select'),
      validate: (filePath: string) => ipcRenderer.invoke('file:validate', filePath),
    },

    // Export APIs
    export: {
      toJson: (projectId: string) => ipcRenderer.invoke('export:json', projectId),
      toMarkdown: (projectId: string) => ipcRenderer.invoke('export:markdown', projectId),
    },

    // Settings APIs
    settings: {
      get: (key: string) => ipcRenderer.invoke('settings:get', key),
      set: (key: string, value: SettingValue) => ipcRenderer.invoke('settings:set', key, value),
      delete: (key: string) => ipcRenderer.invoke('settings:delete', key),
      isEncryptionAvailable: () => ipcRenderer.invoke('settings:isEncryptionAvailable'),
      clearAll: () => ipcRenderer.invoke('settings:clearAll'),
    },
  } satisfies ElectronAPI,
)

// Declare global type for window.electronAPI
declare global {
  interface Window {
    electronAPI: ElectronAPI
  }
}
