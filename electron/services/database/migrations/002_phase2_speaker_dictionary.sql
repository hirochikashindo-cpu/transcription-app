-- Schema version: 002
-- Phase: 2 (拡張機能)
-- Description: Speaker recognition and custom dictionary tables

-- Speakers table (Phase 2)
CREATE TABLE IF NOT EXISTS speakers (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  name TEXT NOT NULL,
  custom_name TEXT,
  color TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);

-- Indexes for speakers table
CREATE INDEX IF NOT EXISTS idx_speakers_project_id ON speakers(project_id);

-- Custom dictionaries table (Phase 2)
CREATE TABLE IF NOT EXISTS custom_dictionaries (
  id TEXT PRIMARY KEY,
  word TEXT NOT NULL UNIQUE,
  reading TEXT,
  category TEXT,
  usage_count INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for custom_dictionaries table
CREATE INDEX IF NOT EXISTS idx_dictionaries_word ON custom_dictionaries(word);
CREATE INDEX IF NOT EXISTS idx_dictionaries_category ON custom_dictionaries(category);

-- Update schema version
INSERT INTO schema_version (version, description)
VALUES (2, 'Phase 2 - Speaker recognition and custom dictionary');
