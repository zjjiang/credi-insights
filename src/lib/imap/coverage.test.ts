import { describe, it, expect } from 'vitest'
import {
  parseCoveredDates,
  addCoveredDate,
  computeWindowCoverage,
  normalizeCoverageDate,
} from './coverage'

describe('normalizeCoverageDate', () => {
  it('slices ISO string to YYYY-MM-DD', () => {
    expect(normalizeCoverageDate('2026-08-10T12:00:00Z')).toBe('2026-08-10')
  })

  it('formats Date using local components', () => {
    expect(normalizeCoverageDate(new Date(2026, 7, 10))).toBe('2026-08-10')
  })
})

describe('parseCoveredDates', () => {
  it('returns empty array for null/empty', () => {
    expect(parseCoveredDates(null)).toEqual([])
    expect(parseCoveredDates('')).toEqual([])
  })

  it('parses a JSON date array', () => {
    expect(parseCoveredDates('["2026-08-07","2026-08-08"]')).toEqual([
      '2026-08-07',
      '2026-08-08',
    ])
  })

  it('returns empty array on malformed JSON (fail-safe)', () => {
    expect(parseCoveredDates('not json')).toEqual([])
  })
})

describe('addCoveredDate (immutable)', () => {
  it('adds a new date, keeps sorted, does not mutate input', () => {
    const before = ['2026-08-08']
    const after = addCoveredDate(before, '2026-08-07')
    expect(after).toEqual(['2026-08-07', '2026-08-08'])
    expect(before).toEqual(['2026-08-08']) // original untouched
  })

  it('is idempotent for an existing date', () => {
    expect(addCoveredDate(['2026-08-08'], '2026-08-08')).toEqual(['2026-08-08'])
  })

  it('normalizes the input date before adding', () => {
    expect(addCoveredDate([], '2026-08-10T09:00:00Z')).toEqual(['2026-08-10'])
  })
})

describe('computeWindowCoverage', () => {
  it('marks each day covered or gap across an inclusive window', () => {
    const covered = ['2026-08-07', '2026-08-09']
    const result = computeWindowCoverage(covered, '2026-08-07', '2026-08-10')
    expect(result).toEqual([
      { date: '2026-08-10', covered: false },
      { date: '2026-08-09', covered: true },
      { date: '2026-08-08', covered: false },
      { date: '2026-08-07', covered: true },
    ])
  })

  it('returns descending dates (most recent first)', () => {
    const result = computeWindowCoverage([], '2026-08-01', '2026-08-03')
    expect(result.map((r) => r.date)).toEqual([
      '2026-08-03',
      '2026-08-02',
      '2026-08-01',
    ])
  })
})
