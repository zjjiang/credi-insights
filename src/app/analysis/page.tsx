"use client"

import { useState, useEffect } from "react"
import { Plus, X } from "lucide-react"
import type { ApiCategory } from "@/lib/api-types"

interface MerchantGroup { merchant: string; count: number; totalAmount: number }

export default function AnalysisPage() {
  const [groups, setGroups] = useState<MerchantGroup[]>([])
  const [categories, setCategories] = useState<ApiCategory[]>([])
  const [loading, setLoading] = useState(true)
  const [dialog, setDialog] = useState<{ merchant: string } | null>(null)
  const [form, setForm] = useState({ name: "", description: "", categoryId: "" })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    Promise.all([
      fetch("/api/analysis/uncategorized").then((r) => r.json()),
      fetch("/api/categories").then((r) => r.json()),
    ]).then(([u, c]) => {
      if (u.success) setGroups(u.data)
      if (c.success) setCategories(c.data)
      setLoading(false)
    })
  }, [])

  function openDialog(merchant: string) {
    setDialog({ merchant })
    setForm({ name: `${merchant} 规则`, description: `商户名包含"${merchant}"`, categoryId: "" })
  }

  async function saveRule() {
    if (!form.name || !form.description || !form.categoryId) return
    setSaving(true)
    await fetch("/api/rules", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    })
    setSaving(false)
    setDialog(null)
  }

  return (
    <div className="flex flex-col p-4 gap-4 pb-24">
      <div>
        <h1 className="text-base font-semibold">未分类交易</h1>
        <p className="text-xs text-muted-foreground mt-0.5">按商户聚合，点击可快速创建分类规则</p>
      </div>

      {loading && <p className="text-sm text-muted-foreground py-8 text-center">加载中...</p>}

      {!loading && groups.length === 0 && (
        <p className="text-sm text-muted-foreground py-8 text-center">所有交易都已分类</p>
      )}

      <div className="space-y-2">
        {groups.map((g) => (
          <div key={g.merchant} className="flex items-center justify-between rounded-lg border px-3 py-2.5">
            <div>
              <p className="text-sm font-medium">{g.merchant}</p>
              <p className="text-xs text-muted-foreground">{g.count} 笔 · ¥{g.totalAmount.toFixed(2)}</p>
            </div>
            <button
              onClick={() => openDialog(g.merchant)}
              className="flex items-center gap-1 rounded bg-primary px-2.5 py-1 text-xs text-primary-foreground"
            >
              <Plus className="h-3 w-3" /> 创建规则
            </button>
          </div>
        ))}
      </div>

      {dialog && (
        <div className="fixed inset-0 z-50 flex items-end bg-black/40" onClick={() => setDialog(null)}>
          <div className="w-full rounded-t-xl bg-background p-4 space-y-3" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold">创建规则</h2>
              <button onClick={() => setDialog(null)}><X className="h-4 w-4" /></button>
            </div>
            <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="规则名称"
              className="w-full rounded border px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-ring" />
            <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="规则描述"
              rows={2}
              className="w-full rounded border px-2 py-1.5 text-xs resize-none focus:outline-none focus:ring-1 focus:ring-ring" />
            <select value={form.categoryId} onChange={(e) => setForm({ ...form, categoryId: e.target.value })}
              className="w-full rounded border bg-background px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-ring">
              <option value="">选择目标分类...</option>
              {categories.map((c) => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
            </select>
            <button onClick={saveRule} disabled={saving || !form.name || !form.description || !form.categoryId}
              className="w-full rounded bg-primary py-2 text-sm text-primary-foreground disabled:opacity-50">
              {saving ? "保存中..." : "保存规则"}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
