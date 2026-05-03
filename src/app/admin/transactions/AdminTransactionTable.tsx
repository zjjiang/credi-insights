"use client"

import { useState } from "react"
import type { ApiTransaction, ApiCategory } from "@/lib/api-types"

interface Props {
  transactions: ApiTransaction[]
  categories: ApiCategory[]
}

export function AdminTransactionTable({ transactions: initial, categories }: Props) {
  const [rows, setRows] = useState(initial)

  async function patch(id: string, field: string, value: unknown) {
    await fetch(`/api/transactions/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ [field]: value }),
    })
    setRows((prev) => prev.map((r) => r.id === id ? { ...r, [field]: value } : r))
  }

  return (
    <div className="overflow-x-auto text-xs">
      <table className="w-full border-collapse">
        <thead>
          <tr className="border-b text-left text-muted-foreground">
            <th className="py-2 pr-3">日期</th>
            <th className="py-2 pr-3">商户</th>
            <th className="py-2 pr-3">金额</th>
            <th className="py-2 pr-3">类型</th>
            <th className="py-2 pr-3">分类</th>
            <th className="py-2 pr-3">用途</th>
            <th className="py-2 pr-3">备注</th>
            <th className="py-2 pr-3">状态</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((t) => (
            <tr key={t.id} className="border-b hover:bg-muted/30">
              <td className="py-1.5 pr-3">
                <input
                  defaultValue={t.txDate.slice(0, 10)}
                  onBlur={(e) => patch(t.id, "txDate", e.target.value)}
                  className="w-24 rounded border px-1 py-0.5"
                />
              </td>
              <td className="py-1.5 pr-3">
                <input
                  defaultValue={t.merchant}
                  onBlur={(e) => patch(t.id, "merchant", e.target.value)}
                  className="w-40 rounded border px-1 py-0.5"
                />
              </td>
              <td className="py-1.5 pr-3">
                <input
                  type="number"
                  defaultValue={t.amount}
                  onBlur={(e) => patch(t.id, "amount", parseFloat(e.target.value))}
                  className="w-20 rounded border px-1 py-0.5"
                />
              </td>
              <td className="py-1.5 pr-3">
                <select
                  defaultValue={t.type}
                  onChange={(e) => patch(t.id, "type", e.target.value)}
                  className="rounded border px-1 py-0.5"
                >
                  <option value="DEBIT">支出</option>
                  <option value="CREDIT">收入</option>
                </select>
              </td>
              <td className="py-1.5 pr-3">
                <select
                  defaultValue={t.categoryId ?? ""}
                  onChange={(e) => patch(t.id, "categoryId", e.target.value || null)}
                  className="rounded border px-1 py-0.5"
                >
                  <option value="">未分类</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>{c.icon} {c.name}</option>
                  ))}
                </select>
              </td>
              <td className="py-1.5 pr-3">
                <input
                  defaultValue={t.purpose ?? ""}
                  onBlur={(e) => patch(t.id, "purpose", e.target.value || null)}
                  className="w-28 rounded border px-1 py-0.5"
                />
              </td>
              <td className="py-1.5 pr-3">
                <input
                  defaultValue={t.note ?? ""}
                  onBlur={(e) => patch(t.id, "note", e.target.value || null)}
                  className="w-28 rounded border px-1 py-0.5"
                />
              </td>
              <td className="py-1.5 pr-3">
                <input
                  defaultValue={t.txStatus ?? ""}
                  onBlur={(e) => patch(t.id, "txStatus", e.target.value || null)}
                  className="w-16 rounded border px-1 py-0.5"
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
