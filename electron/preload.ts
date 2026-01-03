import { contextBridge, ipcRenderer, IpcRendererEvent } from 'electron'
import type {
  CreateProjectData,
  Project,
  ProjectFilter,
  UpdateProjectData,
  Transcription,
  Segment,
  TranscriptionProgress,
  SettingValue,
} from '@shared/types/electron'

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
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
  },
})

// Type definitions for the exposed API
export interface ElectronAPI {
  ping: () => Promise<string>
  project: {
    create: (data: CreateProjectData) => Promise<Project>
    findAll: (filter?: ProjectFilter) => Promise<Project[]>
    findById: (id: string) => Promise<Project>
    update: (id: string, updates: UpdateProjectData) => Promise<Project>
    delete: (id: string) => Promise<void>
  }
  transcription: {
    start: (filePath: string, projectId: string) => Promise<void>
    getByProjectId: (projectId: string) => Promise<Transcription>
    updateSegment: (segmentId: string, text: string) => Promise<Segment>
    onProgress: (callback: (progress: TranscriptionProgress) => void) => () => void
  }
  file: {
    select: () => Promise<string | null>
    validate: (filePath: string) => Promise<{ valid: boolean; error?: string }>
  }
  export: {
    toJson: (projectId: string) => Promise<void>
    toMarkdown: (projectId: string) => Promise<void>
  }
  settings: {
    get: (key: string) => Promise<SettingValue>
    set: (key: string, value: SettingValue) => Promise<void>
  }
}

declare global {
  interface Window {
    electronAPI: ElectronAPI
  }
}
