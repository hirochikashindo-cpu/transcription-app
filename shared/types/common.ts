// Common utility types used across the application

// Generic API response wrapper
export interface ApiResponse<T = unknown> {
  success: boolean
  data?: T
  error?: ApiError
}

// Error types
export interface ApiError {
  code: string
  message: string
  details?: unknown
}

// Pagination types
export interface PaginationParams {
  page: number
  pageSize: number
}

export interface PaginatedResponse<T> {
  items: T[]
  total: number
  page: number
  pageSize: number
  hasMore: boolean
}

// Sort types
export type SortDirection = 'asc' | 'desc'

export interface SortParams {
  field: string
  direction: SortDirection
}

// Date range filter
export interface DateRange {
  start: Date
  end: Date
}

// File types
export interface FileInfo {
  name: string
  path: string
  size: number
  type: string
  lastModified: Date
}

// Progress types
export interface ProgressInfo {
  current: number
  total: number
  percentage: number
  message?: string
}

// Async operation state
export type AsyncState = 'idle' | 'loading' | 'success' | 'error'

export interface AsyncOperation<T = unknown> {
  state: AsyncState
  data?: T
  error?: ApiError
}

// Utility types
export type Nullable<T> = T | null
export type Optional<T> = T | undefined
export type Maybe<T> = T | null | undefined

// ID types
export type UUID = string
export type Timestamp = number
export type ISODateString = string
