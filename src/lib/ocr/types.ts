export interface OcrTransaction {
  merchant: string
  amount: number
  type: 'DEBIT' | 'CREDIT'
  txDate: Date
  cardLast4?: string
  txStatus?: string
  currency: string
}

export interface OcrResult {
  imageMonth?: string
  cardLast4?: string
  transactions: OcrTransaction[]
  rawText?: string
}

export interface OcrAdapter {
  recognize(imagePath: string): Promise<OcrResult>
}
