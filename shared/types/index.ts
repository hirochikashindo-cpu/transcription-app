// Central export file for all shared types
// This allows importing types from a single location: @shared/types

// Electron API and IPC types
export type {
  // Project types
  Project,
  CreateProjectData,
  UpdateProjectData,
  ProjectFilter,
  // Transcription types
  Segment,
  Transcription,
  TranscriptionProgress,
  // File validation types
  FileValidationResult,
  // Settings types
  SettingValue,
  // Electron API interface
  ElectronAPI,
} from './electron'

// Database schema types
export type {
  // Schema version
  SchemaVersionRow,
  // Table row types
  ProjectRow,
  TranscriptionRow,
  SegmentRow,
  SettingRow,
  // Database operation result types
  DatabaseResult,
  QueryResult,
  MutationResult,
} from './database'

// Common utility types
export type {
  // API response types
  ApiResponse,
  ApiError,
  // Pagination types
  PaginationParams,
  PaginatedResponse,
  // Sort types
  SortDirection,
  SortParams,
  // Date range
  DateRange,
  // File types
  FileInfo,
  // Progress types
  ProgressInfo,
  // Async operation types
  AsyncState,
  AsyncOperation,
  // Utility types
  Nullable,
  Optional,
  Maybe,
  UUID,
  Timestamp,
  ISODateString,
} from './common'
