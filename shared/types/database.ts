// Database schema types
// These types represent the raw database rows

// Schema version table
export interface SchemaVersionRow {
  version: number
  applied_at: string // DATETIME stored as string in SQLite
  description: string
}

// Projects table
export interface ProjectRow {
  id: string
  title: string
  description: string | null
  created_at: string // DATETIME stored as string in SQLite
  updated_at: string // DATETIME stored as string in SQLite
  status: 'pending' | 'processing' | 'completed' | 'failed'
  audio_file_path: string
  audio_file_name: string
  audio_file_size: number | null
  audio_duration: number | null
  audio_format: string | null
}

// Transcriptions table
export interface TranscriptionRow {
  id: string
  project_id: string
  content: string
  language: string
  created_at: string // DATETIME stored as string in SQLite
  updated_at: string // DATETIME stored as string in SQLite
}

// Segments table
export interface SegmentRow {
  id: string
  transcription_id: string
  start_time: number
  end_time: number
  text: string
  speaker_id: string | null
  confidence: number | null
  sequence_number: number
}

// Settings table
export interface SettingRow {
  key: string
  value: string
  updated_at: string // DATETIME stored as string in SQLite
}

// Database operation result types
export interface DatabaseResult {
  success: boolean
  error?: string
}

export interface QueryResult<T> extends DatabaseResult {
  data?: T
}

export interface MutationResult extends DatabaseResult {
  changes?: number
  lastInsertRowid?: number
}
