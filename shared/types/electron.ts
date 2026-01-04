// Project types
export interface Project {
  id: string
  title: string
  description?: string
  created_at: Date
  updated_at: Date
  status: 'pending' | 'processing' | 'completed' | 'failed'
  audio_file_path: string
  audio_file_name: string
  audio_file_size?: number
  audio_duration?: number
  audio_format?: string
  processing_time?: number
}

export interface CreateProjectData {
  title: string
  description?: string
  audio_file_path: string
  audio_file_name?: string
  audio_file_size?: number
  audio_duration?: number
  audio_format?: string
}

export interface UpdateProjectData {
  title?: string
  description?: string
  status?: Project['status']
}

export interface ProjectFilter {
  status?: Project['status']
  search?: string
  sortBy?: 'created_at' | 'updated_at' | 'title'
  sortOrder?: 'asc' | 'desc'
}

// Transcription types
export interface Segment {
  id: string
  transcription_id: string
  start_time: number
  end_time: number
  text: string
  speaker_id?: string
  confidence?: number
  sequence_number: number
}

export interface CreateSegmentData {
  transcription_id: string
  start_time: number
  end_time: number
  text: string
  speaker_id?: string
  confidence?: number
  sequence_number: number
}

export interface UpdateSegmentData {
  text?: string
  speaker_id?: string
}

export interface Transcription {
  id: string
  project_id: string
  content: string
  language: string
  created_at: Date
  updated_at: Date
  segments?: Segment[]
}

export interface CreateTranscriptionData {
  project_id: string
  content: string
  language?: string
}

export interface UpdateTranscriptionData {
  content?: string
  language?: string
}

export interface TranscriptionProgress {
  projectId: string
  status: 'processing' | 'completed' | 'failed'
  progress: number
  currentSegment?: number
  totalSegments?: number
  error?: string
}

// Speaker types (Phase 2)
export interface Speaker {
  id: string
  project_id: string
  name: string
  custom_name?: string
  color: string
  created_at: Date
  updated_at: Date
}

export interface CreateSpeakerData {
  project_id: string
  name: string
  custom_name?: string
  color: string
}

export interface UpdateSpeakerData {
  custom_name?: string
  color?: string
}

// Dictionary types (Phase 2)
export interface DictionaryEntry {
  id: string
  word: string
  reading?: string
  category?: string
  usage_count: number
  created_at: Date
  updated_at: Date
}

export interface CreateDictionaryEntryData {
  word: string
  reading?: string
  category?: string
}

export interface UpdateDictionaryEntryData {
  word?: string
  reading?: string
  category?: string
}

export interface DictionaryFilter {
  category?: string
  search?: string
}

// File validation types
export interface FileValidationResult {
  valid: boolean
  error?: string
}

// Settings types
export type SettingValue = string | number | boolean | object

// Electron API interface
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
    validate: (filePath: string) => Promise<FileValidationResult>
  }
  export: {
    toJson: (projectId: string) => Promise<void>
    toMarkdown: (projectId: string) => Promise<void>
  }
  settings: {
    get: (key: string) => Promise<SettingValue>
    set: (key: string, value: SettingValue) => Promise<{ success: boolean }>
    delete: (key: string) => Promise<{ success: boolean }>
    isEncryptionAvailable: () => Promise<boolean>
    clearAll: () => Promise<{ success: boolean }>
  }
  speaker: {
    create: (data: CreateSpeakerData) => Promise<Speaker>
    findByProjectId: (projectId: string) => Promise<Speaker[]>
    findById: (id: string) => Promise<Speaker>
    update: (id: string, updates: UpdateSpeakerData) => Promise<Speaker>
    delete: (id: string) => Promise<void>
  }
  dictionary: {
    create: (data: CreateDictionaryEntryData) => Promise<DictionaryEntry>
    findAll: (filter?: DictionaryFilter) => Promise<DictionaryEntry[]>
    findById: (id: string) => Promise<DictionaryEntry>
    update: (id: string, updates: UpdateDictionaryEntryData) => Promise<DictionaryEntry>
    delete: (id: string) => Promise<void>
    incrementUsage: (id: string) => Promise<DictionaryEntry>
    importFromCsv: () => Promise<{ imported: number; errors: string[] }>
    exportToCsv: () => Promise<void>
  }
}
