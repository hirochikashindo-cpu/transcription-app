import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import Database from 'better-sqlite3'
import { ProjectRepository } from '../../../electron/services/database/repositories/project-repository'
import type { CreateProjectData } from '../../../shared/types/electron'

describe('ProjectRepository', () => {
  let db: Database.Database
  let repository: ProjectRepository

  beforeEach(() => {
    // インメモリデータベースを作成
    db = new Database(':memory:')

    // テーブルを作成
    db.exec(`
      CREATE TABLE IF NOT EXISTS projects (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        description TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        status TEXT DEFAULT 'pending',
        audio_file_path TEXT NOT NULL,
        audio_file_name TEXT,
        audio_file_size INTEGER,
        audio_duration REAL,
        audio_format TEXT
      )
    `)

    repository = new ProjectRepository(db)
  })

  afterEach(() => {
    db.close()
  })

  describe('create', () => {
    it('should create a project with required fields', () => {
      const data: CreateProjectData = {
        title: 'Test Project',
        audio_file_path: '/path/to/audio.mp3',
      }

      const project = repository.create(data)

      expect(project.id).toBeDefined()
      expect(project.title).toBe('Test Project')
      expect(project.audio_file_path).toBe('/path/to/audio.mp3')
      expect(project.status).toBe('pending')
      expect(project.created_at).toBeInstanceOf(Date)
      expect(project.updated_at).toBeInstanceOf(Date)
    })

    it('should create a project with all fields', () => {
      const data: CreateProjectData = {
        title: 'Full Project',
        description: 'A complete project with all fields',
        audio_file_path: '/path/to/audio.mp3',
        audio_file_name: 'audio.mp3',
        audio_file_size: 1024000,
        audio_duration: 300.5,
        audio_format: 'mp3',
      }

      const project = repository.create(data)

      expect(project.title).toBe('Full Project')
      expect(project.description).toBe('A complete project with all fields')
      expect(project.audio_file_name).toBe('audio.mp3')
      expect(project.audio_file_size).toBe(1024000)
      expect(project.audio_duration).toBe(300.5)
      expect(project.audio_format).toBe('mp3')
    })
  })

  describe('findAll', () => {
    beforeEach(() => {
      // テストデータを挿入
      repository.create({
        title: 'Project 1',
        audio_file_path: '/test1.mp3',
        audio_file_name: 'test1.mp3',
      })
      repository.create({
        title: 'Project 2',
        description: 'Second project',
        audio_file_path: '/test2.mp3',
        audio_file_name: 'test2.mp3',
      })
    })

    it('should return all projects', () => {
      const projects = repository.findAll()

      expect(projects).toHaveLength(2)
      expect(projects[0].title).toBe('Project 2') // 降順
      expect(projects[1].title).toBe('Project 1')
    })

    it('should filter projects by status', () => {
      const p1 = repository.findAll()[1]
      repository.update(p1.id, { status: 'completed' })

      const completed = repository.findAll({ status: 'completed' })
      const pending = repository.findAll({ status: 'pending' })

      expect(completed).toHaveLength(1)
      expect(completed[0].status).toBe('completed')
      expect(pending).toHaveLength(1)
      expect(pending[0].status).toBe('pending')
    })

    it('should filter projects by search term', () => {
      const projects = repository.findAll({ search: 'Project 1' })

      expect(projects).toHaveLength(1)
      expect(projects[0].title).toBe('Project 1')
    })

    it('should search in both title and description', () => {
      const projects = repository.findAll({ search: 'Second' })

      expect(projects).toHaveLength(1)
      expect(projects[0].title).toBe('Project 2')
    })

    it('should combine status and search filters', () => {
      const p1 = repository.findAll()[1]
      repository.update(p1.id, { status: 'completed' })

      const projects = repository.findAll({
        status: 'completed',
        search: 'Project 1',
      })

      expect(projects).toHaveLength(1)
      expect(projects[0].title).toBe('Project 1')
      expect(projects[0].status).toBe('completed')
    })
  })

  describe('findById', () => {
    it('should find a project by ID', () => {
      const created = repository.create({
        title: 'Test Project',
        audio_file_path: '/test.mp3',
      })

      const found = repository.findById(created.id)

      expect(found).not.toBeNull()
      expect(found?.id).toBe(created.id)
      expect(found?.title).toBe('Test Project')
    })

    it('should return null if project not found', () => {
      const found = repository.findById('non-existent-id')

      expect(found).toBeNull()
    })
  })

  describe('update', () => {
    it('should update project title', () => {
      const project = repository.create({
        title: 'Original Title',
        audio_file_path: '/test.mp3',
      })

      const updated = repository.update(project.id, { title: 'Updated Title' })

      expect(updated.title).toBe('Updated Title')
      expect(updated.id).toBe(project.id)
    })

    it('should update project description', () => {
      const project = repository.create({
        title: 'Test',
        audio_file_path: '/test.mp3',
      })

      const updated = repository.update(project.id, {
        description: 'New description',
      })

      expect(updated.description).toBe('New description')
    })

    it('should update project status', () => {
      const project = repository.create({
        title: 'Test',
        audio_file_path: '/test.mp3',
      })

      const updated = repository.update(project.id, { status: 'completed' })

      expect(updated.status).toBe('completed')
    })

    it('should update multiple fields at once', () => {
      const project = repository.create({
        title: 'Test',
        audio_file_path: '/test.mp3',
      })

      const updated = repository.update(project.id, {
        title: 'New Title',
        description: 'New Description',
        status: 'processing',
      })

      expect(updated.title).toBe('New Title')
      expect(updated.description).toBe('New Description')
      expect(updated.status).toBe('processing')
    })

    it('should throw error if project not found', () => {
      expect(() => {
        repository.update('non-existent-id', { title: 'New' })
      }).toThrow('Project not found')
    })

    it('should return project unchanged if no updates provided', () => {
      const project = repository.create({
        title: 'Test',
        audio_file_path: '/test.mp3',
      })

      const updated = repository.update(project.id, {})

      expect(updated.title).toBe('Test')
      expect(updated.id).toBe(project.id)
    })
  })

  describe('delete', () => {
    it('should delete a project', () => {
      const project = repository.create({
        title: 'To Delete',
        audio_file_path: '/test.mp3',
      })

      repository.delete(project.id)

      const found = repository.findById(project.id)
      expect(found).toBeNull()
    })

    it('should throw error if project not found', () => {
      expect(() => {
        repository.delete('non-existent-id')
      }).toThrow('Project not found')
    })
  })

  describe('count', () => {
    it('should return 0 for empty database', () => {
      const count = repository.count()

      expect(count).toBe(0)
    })

    it('should return correct count', () => {
      repository.create({ title: 'P1', audio_file_path: '/1.mp3' })
      repository.create({ title: 'P2', audio_file_path: '/2.mp3' })
      repository.create({ title: 'P3', audio_file_path: '/3.mp3' })

      const count = repository.count()

      expect(count).toBe(3)
    })
  })

  describe('countByStatus', () => {
    it('should return empty object for no projects', () => {
      const counts = repository.countByStatus()

      expect(counts).toEqual({})
    })

    it('should count projects by status', () => {
      const p1 = repository.create({ title: 'P1', audio_file_path: '/1.mp3' })
      const p2 = repository.create({ title: 'P2', audio_file_path: '/2.mp3' })
      const p3 = repository.create({ title: 'P3', audio_file_path: '/3.mp3' })

      repository.update(p1.id, { status: 'completed' })
      repository.update(p2.id, { status: 'completed' })
      repository.update(p3.id, { status: 'processing' })

      const counts = repository.countByStatus()

      expect(counts).toEqual({
        completed: 2,
        processing: 1,
      })
    })
  })
})
