import { describe, it, expect } from 'vitest'
import { didGraduateFromDaily } from './graduation'

describe('didGraduateFromDaily', () => {
  it('is true when an existing daily transaction is reconciled by a bill', () => {
    expect(didGraduateFromDaily('daily')).toBe(true)
  })

  it('is false when the existing record was already a bill', () => {
    expect(didGraduateFromDaily('bill')).toBe(false)
  })

  it('is false for unknown/null source (no daily origin known)', () => {
    expect(didGraduateFromDaily(null)).toBe(false)
    expect(didGraduateFromDaily(undefined)).toBe(false)
    expect(didGraduateFromDaily('something')).toBe(false)
  })
})
