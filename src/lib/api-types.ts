export interface ApiCategory {
  id: string
  name: string
  icon: string | null
  color: string | null
  isDefault: boolean
  sortOrder: number
}

export interface ApiTransaction {
  id: string
  uploadId: string
  txDate: string
  merchant: string
  amount: number
  currency: string
  type: "DEBIT" | "CREDIT"
  cardLast4: string | null
  txStatus: string | null
  categoryId: string | null
  category: ApiCategory | null
  purpose: string | null
  note: string | null
  createdAt: string
  updatedAt: string
}

export interface ApiUpload {
  id: string
  originalName: string
  filePath: string
  imageMonth: string | null
  billingStart: string | null
  billingEnd: string | null
  dueDate: string | null
  cardLast4: string | null
  status: "PENDING" | "PROCESSING" | "DONE" | "FAILED"
  txCount: number
  parsedRawText: string | null
  createdAt: string
  transactions?: ApiTransaction[]
}

export interface DashboardByCategory {
  categoryId: string | null
  categoryName: string
  icon: string | null
  color: string | null
  amount: number
}

export interface DashboardByDay {
  date: string
  debit: number
  credit: number
}

export interface DashboardData {
  totalDebit: number
  totalCredit: number
  byCategory: DashboardByCategory[]
  byDay: DashboardByDay[]
}
