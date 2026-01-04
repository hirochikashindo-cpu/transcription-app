-- Schema version: 003
-- Phase: 2 (Processing time tracking)
-- Description: Add processing_time field to projects table

-- Add processing_time column to projects table
ALTER TABLE projects ADD COLUMN processing_time REAL;

-- Update schema version
INSERT INTO schema_version (version, description)
VALUES (3, 'Add processing_time field to projects table');
