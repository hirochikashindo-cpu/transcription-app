import { setupServer } from 'msw/node'
import { handlers } from './handlers'

// Node.js環境用MSWサーバー（Vitest用）
export const server = setupServer(...handlers)
