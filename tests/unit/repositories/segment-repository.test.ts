import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import Database from 'better-sqlite3'
import { SegmentRepository } from '../../../electron/services/database/repositories/segment-repository'
import type { CreateSegmentData } from '../../../shared/types/electron'

describe('SegmentRepository', () => {
  let db: Database.Database
  let repository: SegmentRepository

  beforeEach(() => {
    // インメモリデータベースを作成
    db = new Database(':memory:')

    // テーブルを作成
    db.exec(`
      CREATE TABLE IF NOT EXISTS transcriptions (
        id TEXT PRIMARY KEY,
        project_id TEXT NOT NULL,
        content TEXT NOT NULL
      );

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
    `)

    // テスト用の文字起こしを作成
    db.prepare('INSERT INTO transcriptions (id, project_id, content) VALUES (?, ?, ?)').run(
      'transcription-1',
      'project-1',
      'Full transcription content'
    )

    repository = new SegmentRepository(db)
  })

  afterEach(() => {
    db.close()
  })

  describe('create', () => {
    it('should create a segment with required fields', () => {
      const data: CreateSegmentData = {
        transcription_id: 'transcription-1',
        start_time: 0.0,
        end_time: 5.2,
        text: 'First segment text',
        sequence_number: 0,
      }

      const segment = repository.create(data)

      expect(segment.id).toBeDefined()
      expect(segment.transcription_id).toBe('transcription-1')
      expect(segment.start_time).toBe(0.0)
      expect(segment.end_time).toBe(5.2)
      expect(segment.text).toBe('First segment text')
      expect(segment.sequence_number).toBe(0)
    })

    it('should create a segment with optional fields', () => {
      const data: CreateSegmentData = {
        transcription_id: 'transcription-1',
        start_time: 5.2,
        end_time: 10.0,
        text: 'Second segment text',
        speaker_id: 'speaker-1',
        confidence: 0.95,
        sequence_number: 1,
      }

      const segment = repository.create(data)

      expect(segment.speaker_id).toBe('speaker-1')
      expect(segment.confidence).toBe(0.95)
    })
  })

  describe('createBatch', () => {
    it('should create multiple segments in a transaction', () => {
      const segments: CreateSegmentData[] = [
        {
          transcription_id: 'transcription-1',
          start_time: 0.0,
          end_time: 5.0,
          text: 'First',
          sequence_number: 0,
        },
        {
          transcription_id: 'transcription-1',
          start_time: 5.0,
          end_time: 10.0,
          text: 'Second',
          sequence_number: 1,
        },
        {
          transcription_id: 'transcription-1',
          start_time: 10.0,
          end_time: 15.0,
          text: 'Third',
          sequence_number: 2,
        },
      ]

      const created = repository.createBatch(segments)

      expect(created).toHaveLength(3)
      expect(created[0].text).toBe('First')
      expect(created[1].text).toBe('Second')
      expect(created[2].text).toBe('Third')
    })
  })

  describe('findById', () => {
    it('should find a segment by ID', () => {
      const created = repository.create({
        transcription_id: 'transcription-1',
        start_time: 0.0,
        end_time: 5.0,
        text: 'Test segment',
        sequence_number: 0,
      })

      const found = repository.findById(created.id)

      expect(found).not.toBeNull()
      expect(found?.id).toBe(created.id)
      expect(found?.text).toBe('Test segment')
    })

    it('should return null if segment not found', () => {
      const found = repository.findById('non-existent-id')

      expect(found).toBeNull()
    })
  })

  describe('findByTranscriptionId', () => {
    it('should find all segments for a transcription', () => {
      repository.create({
        transcription_id: 'transcription-1',
        start_time: 0.0,
        end_time: 5.0,
        text: 'First',
        sequence_number: 0,
      })
      repository.create({
        transcription_id: 'transcription-1',
        start_time: 5.0,
        end_time: 10.0,
        text: 'Second',
        sequence_number: 1,
      })

      const segments = repository.findByTranscriptionId('transcription-1')

      expect(segments).toHaveLength(2)
      expect(segments[0].sequence_number).toBe(0)
      expect(segments[1].sequence_number).toBe(1)
    })

    it('should return segments ordered by sequence_number', () => {
      // Create in reverse order
      repository.create({
        transcription_id: 'transcription-1',
        start_time: 10.0,
        end_time: 15.0,
        text: 'Third',
        sequence_number: 2,
      })
      repository.create({
        transcription_id: 'transcription-1',
        start_time: 0.0,
        end_time: 5.0,
        text: 'First',
        sequence_number: 0,
      })
      repository.create({
        transcription_id: 'transcription-1',
        start_time: 5.0,
        end_time: 10.0,
        text: 'Second',
        sequence_number: 1,
      })

      const segments = repository.findByTranscriptionId('transcription-1')

      expect(segments[0].text).toBe('First')
      expect(segments[1].text).toBe('Second')
      expect(segments[2].text).toBe('Third')
    })

    it('should return empty array if no segments found', () => {
      const segments = repository.findByTranscriptionId('transcription-1')

      expect(segments).toEqual([])
    })
  })

  describe('update', () => {
    it('should update segment text', () => {
      const segment = repository.create({
        transcription_id: 'transcription-1',
        start_time: 0.0,
        end_time: 5.0,
        text: 'Original text',
        sequence_number: 0,
      })

      const updated = repository.update(segment.id, { text: 'Updated text' })

      expect(updated.text).toBe('Updated text')
      expect(updated.id).toBe(segment.id)
    })

    it('should update segment speaker_id', () => {
      const segment = repository.create({
        transcription_id: 'transcription-1',
        start_time: 0.0,
        end_time: 5.0,
        text: 'Test',
        sequence_number: 0,
      })

      const updated = repository.update(segment.id, { speaker_id: 'speaker-1' })

      expect(updated.speaker_id).toBe('speaker-1')
    })

    it('should throw error if segment not found', () => {
      expect(() => {
        repository.update('non-existent-id', { text: 'New' })
      }).toThrow('Segment not found')
    })

    it('should return segment unchanged if no updates provided', () => {
      const segment = repository.create({
        transcription_id: 'transcription-1',
        start_time: 0.0,
        end_time: 5.0,
        text: 'Test',
        sequence_number: 0,
      })

      const updated = repository.update(segment.id, {})

      expect(updated.text).toBe('Test')
      expect(updated.id).toBe(segment.id)
    })
  })

  describe('delete', () => {
    it('should delete a segment', () => {
      const segment = repository.create({
        transcription_id: 'transcription-1',
        start_time: 0.0,
        end_time: 5.0,
        text: 'To be deleted',
        sequence_number: 0,
      })

      repository.delete(segment.id)

      const found = repository.findById(segment.id)
      expect(found).toBeNull()
    })

    it('should throw error if segment not found', () => {
      expect(() => {
        repository.delete('non-existent-id')
      }).toThrow('Segment not found')
    })
  })

  describe('deleteByTranscriptionId', () => {
    it('should delete all segments for a transcription', () => {
      repository.create({
        transcription_id: 'transcription-1',
        start_time: 0.0,
        end_time: 5.0,
        text: 'First',
        sequence_number: 0,
      })
      repository.create({
        transcription_id: 'transcription-1',
        start_time: 5.0,
        end_time: 10.0,
        text: 'Second',
        sequence_number: 1,
      })

      repository.deleteByTranscriptionId('transcription-1')

      const segments = repository.findByTranscriptionId('transcription-1')
      expect(segments).toEqual([])
    })

    it('should not throw error if no segments exist', () => {
      expect(() => {
        repository.deleteByTranscriptionId('transcription-1')
      }).not.toThrow()
    })
  })
})
