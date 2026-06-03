import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { classifyTransactions } from '@/lib/ai-classify'
import { getSetting } from '@/lib/settings'

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params
    const apiKey = await getSetting('ANTHROPIC_API_KEY')
    if (!apiKey) return NextResponse.json({ success: false, error: '未配置 API Key' }, { status: 400 })

    const [transactions, rules] = await Promise.all([
      prisma.transaction.findMany({ where: { uploadId: id }, select: { id: true, merchant: true, amount: true } }).then((txs) => txs.map((t) => ({ ...t, amount: Number(t.amount) }))),
      prisma.rule.findMany({ where: { enabled: true }, include: { category: true } }),
    ])

    if (transactions.length === 0) return NextResponse.json({ success: true, data: { classified: 0 } })

    const ruleInputs = rules.map((r) => ({
      description: r.description,
      categoryId: r.categoryId,
      categoryName: r.category.name,
    }))

    const results = await classifyTransactions(transactions, ruleInputs)

    const validTxIds = new Set(transactions.map((t) => t.id))
    const validCategoryIds = new Set(rules.map((r) => r.categoryId))
    const validResults = results.filter((r) => validTxIds.has(r.txId) && validCategoryIds.has(r.categoryId))

    await Promise.all(
      validResults.map((r) => prisma.transaction.update({ where: { id: r.txId }, data: { categoryId: r.categoryId } })),
    )

    return NextResponse.json({ success: true, data: { classified: validResults.length } })
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 })
  }
}
