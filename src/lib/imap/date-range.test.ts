import { describe, it, expect } from 'vitest'
import { buildDateRangeSearch } from './date-range'

describe('buildDateRangeSearch', () => {
  it('builds inclusive range with subject and exclusive before (end+1d)', () => {
    const q = buildDateRangeSearch('2026-08-07', '2026-08-10')
    expect(q.subject).toBe('每日信用管家')
    expect(q.since).toEqual(new Date('2026-08-07T00:00:00'))
    // before is exclusive → end + 1 day
    expect(q.before).toEqual(new Date('2026-08-11T00:00:00'))
  })

  it('handles a single-day range (start === end)', () => {
    const q = buildDateRangeSearch('2026-08-10', '2026-08-10')
    expect(q.since).toEqual(new Date('2026-08-10T00:00:00'))
    expect(q.before).toEqual(new Date('2026-08-11T00:00:00'))
  })

  it('throws on invalid date format', () => {
    expect(() => buildDateRangeSearch('2026/08/10', '2026-08-10')).toThrow()
  })

  it('throws when start is after end', () => {
    expect(() => buildDateRangeSearch('2026-08-11', '2026-08-10')).toThrow()
  })
})
