import { describe, expect, it } from 'vitest'
import { extractJson, normalizeBaseUrl } from './client'

describe('ai client helpers', () => {
  it('extracts JSON wrapped in prose or fences', () => {
    expect(extractJson('Sure!\n```json\n{"steps":["a"]}\n```')).toEqual({ steps: ['a'] })
    expect(() => extractJson('no json')).toThrow()
  })

  it('only accepts http(s) base URLs', () => {
    expect(normalizeBaseUrl('http://localhost:11434/')).toBe('http://localhost:11434')
    expect(() => normalizeBaseUrl('file:///etc/passwd')).toThrow()
    expect(() => normalizeBaseUrl('javascript:alert(1)')).toThrow()
  })
})
