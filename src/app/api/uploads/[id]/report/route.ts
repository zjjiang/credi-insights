import { NextResponse } from 'next/server'
import { renderToBuffer } from '@react-pdf/renderer'
import { prisma } from '@/lib/db'
import { SpendingReportDocument } from '@/lib/report/SpendingReportDocument'

export const dynamic = 'force-dynamic'

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params
    const upload = await prisma.upload.findUnique({ where: { id } })
    if (!upload) {
      return NextResponse.json({ success: false, error: 'Upload not found' }, { status: 404 })
    }

    const transactions = await prisma.transaction.findMany({
      where: { uploadId: id },
      include: { category: true },
      orderBy: { txDate: 'asc' },
    })

    let totalDebit = 0
    let totalCredit = 0
    const categoryMap = new Map<string, { categoryName: string; amount: number }>()
    const merchantMap = new Map<string, { amount: number; count: number }>()

    for (const tx of transactions) {
      const amount = Number(tx.amount)
      if (tx.type === 'DEBIT') {
        totalDebit += amount
        const key = tx.categoryId ?? '__uncategorized__'
        const cat = categoryMap.get(key) ?? { categoryName: tx.category?.name ?? '未分类', amount: 0 }
        categoryMap.set(key, { ...cat, amount: cat.amount + amount })
        const m = merchantMap.get(tx.merchant) ?? { amount: 0, count: 0 }
        merchantMap.set(tx.merchant, { amount: m.amount + amount, count: m.count + 1 })
      } else {
        totalCredit += amount
      }
    }

    const byCategory = Array.from(categoryMap.values())
      .sort((a, b) => b.amount - a.amount)
      .map((cat) => ({ ...cat, percentage: totalDebit > 0 ? (cat.amount / totalDebit) * 100 : 0 }))

    const topMerchants = Array.from(merchantMap.entries())
      .map(([merchant, v]) => ({ merchant, ...v }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 10)

    const topTransactions = transactions
      .filter((tx) => tx.type === 'DEBIT')
      .sort((a, b) => Number(b.amount) - Number(a.amount))
      .slice(0, 10)
      .map((tx) => ({
        txDate: tx.txDate.toISOString().slice(5, 10),
        merchant: tx.merchant,
        amount: Number(tx.amount),
        categoryName: tx.category?.name ?? '未分类',
      }))

    const avgPerTx = transactions.length > 0 ? totalDebit / transactions.filter((t) => t.type === 'DEBIT').length : 0
    const topCategory = byCategory[0]
    const tips: string[] = []
    if (topCategory && topCategory.percentage > 40) {
      tips.push(`${topCategory.categoryName}占比达 ${topCategory.percentage.toFixed(0)}%，建议关注该类支出是否有优化空间`)
    }
    if (topMerchants[0] && topMerchants[0].count >= 10) {
      tips.push(`在「${topMerchants[0].merchant}」消费 ${topMerchants[0].count} 次，可考虑是否有会员/套餐等省钱方式`)
    }
    if (avgPerTx > 200) {
      tips.push(`笔均消费 ¥${avgPerTx.toFixed(0)}，大额消费较多，建议提前做预算规划`)
    }
    if (byCategory.find((c) => c.categoryName === '未分类' && c.percentage > 20)) {
      tips.push('未分类消费占比较高，建议完善分类规则以便更好地追踪支出')
    }
    if (tips.length === 0) {
      tips.push('本期消费结构较为均衡，继续保持良好的消费习惯')
    }

    const billingStart = upload.billingStart?.toISOString().slice(0, 10) ?? '未知'
    const billingEnd = upload.billingEnd?.toISOString().slice(0, 10) ?? '未知'

    const buffer = await renderToBuffer(
      SpendingReportDocument({
        billingStart,
        billingEnd,
        cardLast4: upload.cardLast4,
        totalDebit,
        totalCredit,
        txCount: transactions.length,
        byCategory,
        topMerchants,
        topTransactions,
        tips,
      }),
    )

    return new Response(new Uint8Array(buffer), {
      headers: {
        'Content-Type': 'application/pdf',
        'Cache-Control': 'no-store',
        'Content-Disposition': `attachment; filename="report_${billingStart}_${billingEnd}.pdf"`,
      },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Report generation failed'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
