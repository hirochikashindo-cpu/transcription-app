-- Schema version: 001
-- Phase: 1 (MVP)
-- Description: Initial database schema for transcription app

-- Schema version tracking table
CREATE TABLE IF NOT EXISTS schema_version (
  version INTEGER PRIMARY KEY,
  applied_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  description TEXT NOT NULL
);

-- Projects table
CREATE TABLE IF NOT EXISTS projects (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'processing', 'completed', 'failed')),
  audio_file_path TEXT NOT NULL,
  audio_file_name TEXT NOT NULL,
  audio_file_size INTEGER,
  audio_duration REAL,
  audio_format TEXT
);

-- Indexes for projects table
CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status);
CREATE INDEX IF NOT EXISTS idx_projects_created_at ON projects(created_at DESC);

-- Transcriptions table
CREATE TABLE IF NOT EXISTS transcriptions (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  content TEXT NOT NULL,
  language TEXT DEFAULT 'ja',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);

-- Indexes for transcriptions table
CREATE INDEX IF NOT EXISTS idx_transcriptions_project_id ON transcriptions(project_id);

-- Segments table (for timestamped text segments)
CREATE TABLE IF NOT EXISTS segments (
  id TEXT PRIMARY KEY,
  transcription_id TEXT NOT NULL,
  start_time REAL NOT NULL,
  end_time REAL NOT NULL,
  text TEXT NOT NULL,
  speaker_id TEXT,
  confidence REAL,
  sequence_number INTEGER NOT NULL,
  FOREIGN KEY (transcription_id) REFERENCES transcriptions(id) ON DELETE CASCADE
);

-- Indexes for segments table
CREATE INDEX IF NOT EXISTS idx_segments_transcription_id ON segments(transcription_id);
CREATE INDEX IF NOT EXISTS idx_segments_sequence ON segments(transcription_id, sequence_number);

-- Settings table (for API keys and app configuration)
CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Insert initial schema version
INSERT INTO schema_version (version, description)
VALUES (1, 'Initial schema - Phase 1 MVP');
