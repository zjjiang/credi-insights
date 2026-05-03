"use client"

import { useState } from "react"
import { Trash2 } from "lucide-react"
import type { ApiTransaction, ApiCategory } from "@/lib/api-types"

interface TransactionListProps {
  transactions: ApiTransaction[]
  categories: ApiCategory[]
  selectable?: boolean
}

export function TransactionList({ transactions: initial, categories, selectable = true }: TransactionListProps) {
  const [transactions, setTransactions] = useState(initial)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [bulkCategoryId, setBulkCategoryId] = useState("")
  const [applying, setApplying] = useState(false)

  const totalDebit = transactions.filter((t) => t.type === "DEBIT").reduce((s, t) => s + Number(t.amount), 0)

  function toggleSelect(id: string) {
    setSelected((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })
  }
  function toggleAll() {
    setSelected((prev) => prev.size === transactions.length ? new Set() : new Set(transactions.map((t) => t.id)))
  }

  async function applyBulk() {
    if (!bulkCategoryId || selected.size === 0) return
    setApplying(true)
    await fetch("/api/transactions/bulk", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: [...selected], categoryId: bulkCategoryId }),
    })
    const cat = categories.find((c) => c.id === bulkCategoryId) ?? null
    setTransactions((prev) => prev.map((t) => selected.has(t.id) ? { ...t, categoryId: bulkCategoryId, category: cat } : t))
    setSelected(new Set())
    setBulkCategoryId("")
    setApplying(false)
  }

  async function patch(id: string, field: string, value: unknown) {
    await fetch(`/api/transactions/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ [field]: value }),
    })
  }

  if (transactions.length === 0) {
    return <div className="py-12 text-center text-sm text-muted-foreground">暂无交易记录</div>
  }

  return (
    <div>
      {/* 汇总栏 */}
      <div className="mb-2 flex items-center justify-between rounded-lg bg-muted/40 px-3 py-2">
        {selectable ? (
          <label className="flex cursor-pointer items-center gap-2 text-sm text-muted-foreground">
            <input type="checkbox" checked={selected.size === transactions.length} onChange={toggleAll} />
            共 {transactions.length} 笔
          </label>
        ) : (
          <span className="text-sm text-muted-foreground">共 {transactions.length} 笔</span>
        )}
        <span className="text-sm font-medium">
          支出合计 <span className="text-red-500">¥{totalDebit.toFixed(2)}</span>
        </span>
      </div>

      {/* 批量操作栏 */}
      {selectable && selected.size > 0 && (
        <div className="mb-2 flex items-center gap-2 rounded-lg border bg-background px-3 py-2">
          <span className="text-sm text-muted-foreground">已选 {selected.size} 笔</span>
          <select
            value={bulkCategoryId}
            onChange={(e) => setBulkCategoryId(e.target.value)}
            className="flex-1 rounded border bg-background px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-ring"
          >
            <option value="">选择分类...</option>
            {categories.map((c) => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
          </select>
          <button onClick={applyBulk} disabled={!bulkCategoryId || applying}
            className="rounded bg-primary px-3 py-1 text-xs text-primary-foreground disabled:opacity-50">应用</button>
          <button onClick={() => setSelected(new Set())} className="text-xs text-muted-foreground">取消</button>
        </div>
      )}

      {/* 表格 */}
      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full text-xs">
          <thead className="bg-muted/50">
            <tr>
              {selectable && <th className="w-8 px-2 py-2"><input type="checkbox" checked={selected.size === transactions.length} onChange={toggleAll} /></th>}
              <th className="px-3 py-2 text-left font-medium text-muted-foreground">日期</th>
              <th className="px-3 py-2 text-left font-medium text-muted-foreground">商户</th>
              <th className="px-3 py-2 text-right font-medium text-muted-foreground">金额</th>
              <th className="px-3 py-2 text-left font-medium text-muted-foreground">分类</th>
              <th className="px-3 py-2 text-left font-medium text-muted-foreground">备注</th>
              <th className="w-8 px-2 py-2"></th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {transactions.map((t) => (
              <TableRow
                key={t.id}
                transaction={t}
                categories={categories}
                selected={selected.has(t.id)}
                onSelect={selectable ? () => toggleSelect(t.id) : undefined}
                onDelete={(id) => setTransactions((prev) => prev.filter((tx) => tx.id !== id))}
                onPatch={patch}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

interface RowProps {
  transaction: ApiTransaction
  categories: ApiCategory[]
  selected: boolean
  onSelect?: () => void
  onDelete: (id: string) => void
  onPatch: (id: string, field: string, value: unknown) => Promise<void>
}

function TableRow({ transaction: t, categories, selected, onSelect, onDelete, onPatch }: RowProps) {
  const [merchant, setMerchant] = useState(t.merchant)
  const [note, setNote] = useState(t.note ?? "")
  const [categoryId, setCategoryId] = useState(t.categoryId ?? "")
  const isDebit = t.type === "DEBIT"
  const date = new Date(t.txDate)
  const dateStr = `${date.getMonth() + 1}/${date.getDate()}`

  return (
    <tr className={`transition-colors hover:bg-muted/30 ${selected ? "bg-primary/5" : ""}`}>
      {onSelect && (
        <td className="px-2 py-1.5 text-center">
          <input type="checkbox" checked={selected} onChange={onSelect} />
        </td>
      )}
      <td className="whitespace-nowrap px-3 py-1.5 text-muted-foreground">{dateStr}</td>
      <td className="px-3 py-1.5">
        <input
          value={merchant}
          onChange={(e) => setMerchant(e.target.value)}
          onBlur={() => { if (merchant !== t.merchant) onPatch(t.id, "merchant", merchant) }}
          className="w-full min-w-[120px] bg-transparent focus:outline-none focus:ring-1 focus:ring-ring rounded px-1"
        />
      </td>
      <td className={`whitespace-nowrap px-3 py-1.5 text-right font-medium ${isDebit ? "text-red-500" : "text-green-600"}`}>
        {isDebit ? "-" : "+"}¥{Number(t.amount).toFixed(2)}
      </td>
      <td className="px-3 py-1.5">
        <select
          value={categoryId}
          onChange={(e) => { setCategoryId(e.target.value); onPatch(t.id, "categoryId", e.target.value || null) }}
          className="w-full min-w-[80px] rounded border bg-background px-1 py-0.5 focus:outline-none focus:ring-1 focus:ring-ring"
        >
          <option value="">未分类</option>
          {categories.map((c) => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
        </select>
      </td>
      <td className="px-3 py-1.5">
        <input
          value={note}
          onChange={(e) => setNote(e.target.value)}
          onBlur={() => { if (note !== (t.note ?? "")) onPatch(t.id, "note", note || null) }}
          placeholder="备注..."
          className="w-full min-w-[80px] bg-transparent focus:outline-none focus:ring-1 focus:ring-ring rounded px-1"
        />
      </td>
      <td className="px-2 py-1.5 text-center">
        <button onClick={() => onDelete(t.id)} className="text-muted-foreground hover:text-destructive">
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </td>
    </tr>
  )
}
