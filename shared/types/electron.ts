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
}

export interface CreateProjectData {
  title: string
  description?: string
  audio_file_path: string
  audio_file_name: string
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

export interface Transcription {
  id: string
  project_id: string
  content: string
  language: string
  created_at: Date
  updated_at: Date
  segments?: Segment[]
}

export interface TranscriptionProgress {
  projectId: string
  status: 'processing' | 'completed' | 'failed'
  progress: number
  currentSegment?: number
  totalSegments?: number
  error?: string
}

// File validation types
export interface FileValidationResult {
  valid: boolean
  error?: string
}

// Settings types
export type SettingValue = string | number | boolean | object
