import { describe, it, expect } from 'vitest'

// Example utility function
function add(a: number, b: number): number {
  return a + b
}

describe('Example Test Suite', () => {
  it('should add two numbers correctly', () => {
    expect(add(1, 2)).toBe(3)
    expect(add(-1, 1)).toBe(0)
    expect(add(0, 0)).toBe(0)
  })

  it('should handle floating point numbers', () => {
    expect(add(0.1, 0.2)).toBeCloseTo(0.3)
  })
})

// Example async test
describe('Async Operations', () => {
  it('should resolve promises', async () => {
    const promise = Promise.resolve(42)
    await expect(promise).resolves.toBe(42)
  })

  it('should reject promises', async () => {
    const promise = Promise.reject(new Error('Test error'))
    await expect(promise).rejects.toThrow('Test error')
  })
})
