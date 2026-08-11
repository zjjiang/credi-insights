import { describe, it, expect } from 'vitest'
import { parseDailyEmail } from './parse-daily'

const SAMPLE = `2026/07/25 您的消费明细如下：
10:26:03
CNY 28.00
尾号0094 消费 支付宝-东吴面馆
14:03:35
CNY 50.00
尾号0094 消费 支付宝-林屋洞`

describe('parseDailyEmail coveredDates', () => {
  it('extracts the date header even alongside transactions', () => {
    const { transactions, coveredDates } = parseDailyEmail({ text: SAMPLE })
    expect(transactions).toHaveLength(2)
    expect(coveredDates).toEqual(['2026-07-25'])
  })

  it('reports covered date for a no-consumption email (header, no tx)', () => {
    const { transactions, coveredDates } = parseDailyEmail({
      text: '2026/07/26 您的消费明细如下：\n（今日无消费）',
    })
    expect(transactions).toHaveLength(0)
    expect(coveredDates).toEqual(['2026-07-26'])
  })

  it('returns empty coveredDates when no date header present', () => {
    const { coveredDates } = parseDailyEmail({ text: 'unrelated content' })
    expect(coveredDates).toEqual([])
  })

  it('dedups and sorts multiple date headers', () => {
    const { coveredDates } = parseDailyEmail({
      text: '2026/07/26 您的消费明细如下：\n2026/07/25 您的消费明细如下：',
    })
    expect(coveredDates).toEqual(['2026-07-25', '2026-07-26'])
  })
})
