import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

function getMonthBounds(month: string): { start: Date; end: Date } {
  const [year, mon] = month.split('-').map(Number)
  const start = new Date(year, mon - 1, 1)
  const end = new Date(year, mon, 1)
  return { start, end }
}

function toISODate(d: Date): string {
  return d.toISOString().slice(0, 10)
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const month = searchParams.get('month')

    if (!month || !/^\d{4}-\d{2}$/.test(month)) {
      return NextResponse.json(
        { success: false, error: 'month query param required (format: 2026-04)' },
        { status: 400 },
      )
    }

    const { start, end } = getMonthBounds(month)

    const transactions = await prisma.transaction.findMany({
      where: { txDate: { gte: start, lt: end } },
      include: { category: true },
    })

    let totalDebit = 0
    let totalCredit = 0
    const byCategoryMap = new Map<
      string,
      { categoryId: string; categoryName: string; icon: string | null; color: string | null; amount: number }
    >()
    const byDayMap = new Map<string, { debit: number; credit: number }>()

    for (const tx of transactions) {
      const amount = Number(tx.amount)
      const dateKey = toISODate(tx.txDate)

      if (tx.type === 'DEBIT') {
        totalDebit += amount

        const catKey = tx.categoryId ?? '__uncategorized__'
        const existing = byCategoryMap.get(catKey)
        if (existing) {
          byCategoryMap.set(catKey, { ...existing, amount: existing.amount + amount })
        } else {
          byCategoryMap.set(catKey, {
            categoryId: tx.categoryId ?? '',
            categoryName: tx.category?.name ?? '未分类',
            icon: tx.category?.icon ?? null,
            color: tx.category?.color ?? null,
            amount,
          })
        }
      } else {
        totalCredit += amount
      }

      const day = byDayMap.get(dateKey) ?? { debit: 0, credit: 0 }
      if (tx.type === 'DEBIT') {
        byDayMap.set(dateKey, { ...day, debit: day.debit + amount })
      } else {
        byDayMap.set(dateKey, { ...day, credit: day.credit + amount })
      }
    }

    const byCategory = Array.from(byCategoryMap.values()).sort(
      (a, b) => b.amount - a.amount,
    )

    const byDay = Array.from(byDayMap.entries())
      .map(([date, { debit, credit }]) => ({ date, debit, credit }))
      .sort((a, b) => a.date.localeCompare(b.date))

    return NextResponse.json({
      success: true,
      data: { totalDebit, totalCredit, byCategory, byDay },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Dashboard query failed'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
