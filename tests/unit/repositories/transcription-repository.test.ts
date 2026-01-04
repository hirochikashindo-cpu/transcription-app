import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import Database from 'better-sqlite3'
import { TranscriptionRepository } from '../../../electron/services/database/repositories/transcription-repository'
import type { CreateTranscriptionData } from '../../../shared/types/electron'

describe('TranscriptionRepository', () => {
  let db: Database.Database
  let repository: TranscriptionRepository

  beforeEach(() => {
    // インメモリデータベースを作成
    db = new Database(':memory:')

    // テーブルを作成
    db.exec(`
      CREATE TABLE IF NOT EXISTS projects (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        audio_file_path TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS transcriptions (
        id TEXT PRIMARY KEY,
        project_id TEXT NOT NULL,
        content TEXT NOT NULL,
        language TEXT DEFAULT 'ja',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
      );
    `)

    // テスト用のプロジェクトを作成
    db.prepare('INSERT INTO projects (id, title, audio_file_path) VALUES (?, ?, ?)').run(
      'project-1',
      'Test Project',
      '/test.mp3'
    )

    repository = new TranscriptionRepository(db)
  })

  afterEach(() => {
    db.close()
  })

  describe('create', () => {
    it('should create a transcription with required fields', () => {
      const data: CreateTranscriptionData = {
        project_id: 'project-1',
        content: 'This is a test transcription.',
      }

      const transcription = repository.create(data)

      expect(transcription.id).toBeDefined()
      expect(transcription.project_id).toBe('project-1')
      expect(transcription.content).toBe('This is a test transcription.')
      expect(transcription.language).toBe('ja')
      expect(transcription.created_at).toBeInstanceOf(Date)
      expect(transcription.updated_at).toBeInstanceOf(Date)
    })

    it('should create a transcription with custom language', () => {
      const data: CreateTranscriptionData = {
        project_id: 'project-1',
        content: 'This is an English transcription.',
        language: 'en',
      }

      const transcription = repository.create(data)

      expect(transcription.language).toBe('en')
    })
  })

  describe('findById', () => {
    it('should find a transcription by ID', () => {
      const created = repository.create({
        project_id: 'project-1',
        content: 'Test content',
      })

      const found = repository.findById(created.id)

      expect(found).not.toBeNull()
      expect(found?.id).toBe(created.id)
      expect(found?.content).toBe('Test content')
    })

    it('should return null if transcription not found', () => {
      const found = repository.findById('non-existent-id')

      expect(found).toBeNull()
    })
  })

  describe('findByProjectId', () => {
    it('should find a transcription by project ID', () => {
      const created = repository.create({
        project_id: 'project-1',
        content: 'Test content',
      })

      const found = repository.findByProjectId('project-1')

      expect(found).not.toBeNull()
      expect(found?.id).toBe(created.id)
      expect(found?.project_id).toBe('project-1')
    })

    it('should return null if no transcription for project', () => {
      const found = repository.findByProjectId('project-1')

      expect(found).toBeNull()
    })
  })

  describe('update', () => {
    it('should update transcription content', () => {
      const transcription = repository.create({
        project_id: 'project-1',
        content: 'Original content',
      })

      const updated = repository.update(transcription.id, {
        content: 'Updated content',
      })

      expect(updated.content).toBe('Updated content')
      expect(updated.id).toBe(transcription.id)
    })

    it('should update transcription language', () => {
      const transcription = repository.create({
        project_id: 'project-1',
        content: 'Test content',
        language: 'ja',
      })

      const updated = repository.update(transcription.id, {
        language: 'en',
      })

      expect(updated.language).toBe('en')
    })

    it('should throw error if transcription not found', () => {
      expect(() => {
        repository.update('non-existent-id', { content: 'New' })
      }).toThrow('Transcription not found')
    })

    it('should return transcription unchanged if no updates provided', () => {
      const transcription = repository.create({
        project_id: 'project-1',
        content: 'Test content',
      })

      const updated = repository.update(transcription.id, {})

      expect(updated.content).toBe('Test content')
      expect(updated.id).toBe(transcription.id)
    })
  })

  describe('delete', () => {
    it('should delete a transcription', () => {
      const transcription = repository.create({
        project_id: 'project-1',
        content: 'To be deleted',
      })

      repository.delete(transcription.id)

      const found = repository.findById(transcription.id)
      expect(found).toBeNull()
    })

    it('should throw error if transcription not found', () => {
      expect(() => {
        repository.delete('non-existent-id')
      }).toThrow('Transcription not found')
    })
  })

  describe('deleteByProjectId', () => {
    it('should delete all transcriptions for a project', () => {
      repository.create({
        project_id: 'project-1',
        content: 'First transcription',
      })

      repository.deleteByProjectId('project-1')

      const found = repository.findByProjectId('project-1')
      expect(found).toBeNull()
    })

    it('should not throw error if no transcriptions exist', () => {
      expect(() => {
        repository.deleteByProjectId('project-1')
      }).not.toThrow()
    })
  })
})
