import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import Database from 'better-sqlite3'
import { SettingsRepository } from '../../../electron/services/database/repositories/settings-repository'

describe('SettingsRepository', () => {
  let db: Database.Database
  let repository: SettingsRepository

  beforeEach(() => {
    // インメモリデータベースを作成
    db = new Database(':memory:')

    // テーブルを作成
    db.exec(`
      CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `)

    repository = new SettingsRepository(db)
  })

  afterEach(() => {
    db.close()
  })

  describe('set and get', () => {
    it('should store and retrieve a string value', () => {
      repository.set('api_key', 'sk-1234567890')

      const value = repository.get('api_key')

      expect(value).toBe('sk-1234567890')
    })

    it('should store and retrieve a number value', () => {
      repository.set('timeout', 5000)

      const value = repository.get('timeout')

      expect(value).toBe(5000)
    })

    it('should store and retrieve a boolean value', () => {
      repository.set('dark_mode', true)

      const value = repository.get('dark_mode')

      expect(value).toBe(true)
    })

    it('should store and retrieve an object value', () => {
      const obj = { language: 'ja', model: 'whisper-1' }
      repository.set('whisper_config', obj)

      const value = repository.get('whisper_config')

      expect(value).toEqual(obj)
    })

    it('should update existing value', () => {
      repository.set('api_key', 'old-key')
      repository.set('api_key', 'new-key')

      const value = repository.get('api_key')

      expect(value).toBe('new-key')
    })

    it('should return null for non-existent key', () => {
      const value = repository.get('non_existent_key')

      expect(value).toBeNull()
    })
  })

  describe('has', () => {
    it('should return true if key exists', () => {
      repository.set('api_key', 'sk-1234567890')

      expect(repository.has('api_key')).toBe(true)
    })

    it('should return false if key does not exist', () => {
      expect(repository.has('non_existent_key')).toBe(false)
    })
  })

  describe('delete', () => {
    it('should delete a setting', () => {
      repository.set('api_key', 'sk-1234567890')

      repository.delete('api_key')

      const value = repository.get('api_key')
      expect(value).toBeNull()
    })

    it('should throw error if key not found', () => {
      expect(() => {
        repository.delete('non_existent_key')
      }).toThrow('Setting not found')
    })
  })

  describe('getAll', () => {
    it('should return all settings', () => {
      repository.set('api_key', 'sk-1234567890')
      repository.set('timeout', 5000)
      repository.set('dark_mode', true)

      const all = repository.getAll()

      expect(all).toEqual({
        api_key: 'sk-1234567890',
        timeout: 5000,
        dark_mode: true,
      })
    })

    it('should return empty object if no settings', () => {
      const all = repository.getAll()

      expect(all).toEqual({})
    })
  })

  describe('clearAll', () => {
    it('should delete all settings', () => {
      repository.set('api_key', 'sk-1234567890')
      repository.set('timeout', 5000)
      repository.set('dark_mode', true)

      repository.clearAll()

      const all = repository.getAll()
      expect(all).toEqual({})
    })

    it('should not throw error if no settings exist', () => {
      expect(() => {
        repository.clearAll()
      }).not.toThrow()
    })
  })

  describe('complex scenarios', () => {
    it('should handle nested objects', () => {
      const config = {
        whisper: {
          model: 'whisper-1',
          language: 'ja',
        },
        export: {
          format: 'json',
          includeTimestamps: true,
        },
      }

      repository.set('app_config', config)

      const value = repository.get('app_config')

      expect(value).toEqual(config)
    })

    it('should handle arrays', () => {
      const recentFiles = ['/path/to/file1.mp3', '/path/to/file2.mp3', '/path/to/file3.mp3']

      repository.set('recent_files', recentFiles)

      const value = repository.get('recent_files')

      expect(value).toEqual(recentFiles)
    })
  })
})
