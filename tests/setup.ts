import { expect, afterEach, beforeAll, afterAll, vi } from 'vitest'
import { cleanup } from '@testing-library/react'
import * as matchers from '@testing-library/jest-dom/matchers'
import { server } from './mocks/server'

// Extend Vitest's expect with jest-dom matchers
expect.extend(matchers)

// MSW server setup
beforeAll(() => server.listen({ onUnhandledRequest: 'warn' }))
afterAll(() => server.close())
afterEach(() => server.resetHandlers())

// Cleanup after each test
afterEach(() => {
  cleanup()
})

// Mock Electron API
global.window.electronAPI = {
  ping: vi.fn(() => Promise.resolve('pong')),
  project: {
    create: vi.fn(),
    findAll: vi.fn(() => Promise.resolve([])),
    findById: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
  transcription: {
    start: vi.fn(),
    getByProjectId: vi.fn(),
    updateSegment: vi.fn(),
    onProgress: vi.fn(() => () => {}),
  },
  file: {
    select: vi.fn(),
    validate: vi.fn(),
  },
  export: {
    toJson: vi.fn(),
    toMarkdown: vi.fn(),
  },
  settings: {
    get: vi.fn(),
    set: vi.fn(),
    delete: vi.fn(),
    isEncryptionAvailable: vi.fn(() => Promise.resolve(true)),
    clearAll: vi.fn(),
  },
}
