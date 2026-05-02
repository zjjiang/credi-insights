import type { OcrAdapter, OcrResult } from './types'

export class MockOcrAdapter implements OcrAdapter {
  async recognize(_imagePath: string): Promise<OcrResult> {
    const imageMonth = '2026-04'
    const cardLast4 = '0094'

    return {
      imageMonth,
      cardLast4,
      transactions: [
        {
          merchant: '美团外卖',
          amount: 38.5,
          type: 'DEBIT',
          txDate: new Date('2026-04-05T12:30:00'),
          cardLast4,
          txStatus: '已入账',
          currency: 'CNY',
        },
        {
          merchant: '滴滴出行',
          amount: 15.0,
          type: 'DEBIT',
          txDate: new Date('2026-04-05T09:15:00'),
          cardLast4,
          txStatus: '已入账',
          currency: 'CNY',
        },
        {
          merchant: '工资',
          amount: 12000.0,
          type: 'CREDIT',
          txDate: new Date('2026-04-01T08:00:00'),
          cardLast4,
          txStatus: '已入账',
          currency: 'CNY',
        },
        {
          merchant: '盒马鲜生',
          amount: 127.3,
          type: 'DEBIT',
          txDate: new Date('2026-04-04T18:45:00'),
          cardLast4,
          txStatus: '已入账',
          currency: 'CNY',
        },
        {
          merchant: '京东商城',
          amount: 299.0,
          type: 'DEBIT',
          txDate: new Date('2026-04-03T21:00:00'),
          cardLast4,
          txStatus: '未入账',
          currency: 'CNY',
        },
      ],
      rawText: '[mock OCR output]',
    }
  }
}
