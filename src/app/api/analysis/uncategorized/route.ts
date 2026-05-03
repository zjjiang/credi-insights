import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET() {
  try {
    const txs = await prisma.transaction.findMany({
      where: { categoryId: null },
      select: { merchant: true, amount: true, type: true },
    })

    const map = new Map<string, { count: number; totalAmount: number }>()
    for (const tx of txs) {
      const key = tx.merchant
      const cur = map.get(key) ?? { count: 0, totalAmount: 0 }
      map.set(key, { count: cur.count + 1, totalAmount: cur.totalAmount + Number(tx.amount) })
    }

    const data = Array.from(map.entries())
      .map(([merchant, { count, totalAmount }]) => ({ merchant, count, totalAmount }))
      .sort((a, b) => b.count - a.count)

    return NextResponse.json({ success: true, data })
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 })
  }
}
