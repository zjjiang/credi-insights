export const dynamic = 'force-dynamic'

import { prisma } from "@/lib/db"
import { AdminTransactionTable } from "./AdminTransactionTable"

export default async function AdminTransactionsPage() {
  const [transactions, categories] = await Promise.all([
    prisma.transaction.findMany({
      include: { category: true },
      orderBy: { txDate: "desc" },
    }),
    prisma.category.findMany({ orderBy: { sortOrder: "asc" } }),
  ])

  const txData = transactions.map((t) => ({
    ...t,
    txDate: t.txDate.toISOString(),
    amount: Number(t.amount),
    createdAt: t.createdAt.toISOString(),
    updatedAt: t.updatedAt.toISOString(),
    category: t.category
      ? { ...t.category }
      : null,
  }))

  return (
    <div className="p-4">
      <h1 className="mb-4 text-lg font-semibold">明细编辑 <span className="text-xs text-muted-foreground">/admin/transactions</span></h1>
      <AdminTransactionTable transactions={txData} categories={categories} />
    </div>
  )
}
