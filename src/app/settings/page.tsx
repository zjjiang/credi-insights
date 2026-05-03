"use client"

import { useState, useEffect } from "react"
import { Trash2, Plus } from "lucide-react"
import type { ApiCategory } from "@/lib/api-types"

interface ApiRule {
  id: string
  name: string
  description: string
  categoryId: string
  category: ApiCategory
  enabled: boolean
}

export default function SettingsPage() {
  const [apiKey, setApiKey] = useState("")
  const [baseUrl, setBaseUrl] = useState("")
  const [aiModel, setAiModel] = useState("")
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [rules, setRules] = useState<ApiRule[]>([])
  const [categories, setCategories] = useState<ApiCategory[]>([])
  const [newRule, setNewRule] = useState({ name: "", description: "", categoryId: "" })
  const [addingRule, setAddingRule] = useState(false)

  useEffect(() => {
    fetch("/api/settings").then((r) => r.json()).then((j) => {
      if (j.data?.ANTHROPIC_API_KEY) setApiKey(j.data.ANTHROPIC_API_KEY)
      if (j.data?.AI_BASE_URL) setBaseUrl(j.data.AI_BASE_URL)
      if (j.data?.AI_MODEL) setAiModel(j.data.AI_MODEL)
    })
    fetch("/api/rules").then((r) => r.json()).then((j) => { if (j.success) setRules(j.data) })
    fetch("/api/categories").then((r) => r.json()).then((j) => { if (j.success) setCategories(j.data) })
  }, [])

  async function saveKey() {
    setSaving(true)
    await fetch("/api/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ANTHROPIC_API_KEY: apiKey, AI_BASE_URL: baseUrl, AI_MODEL: aiModel }),
    })
    setSaving(false); setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  async function toggleRule(id: string, enabled: boolean) {
    await fetch(`/api/rules/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ enabled }),
    })
    setRules((prev) => prev.map((r) => r.id === id ? { ...r, enabled } : r))
  }

  async function deleteRule(id: string) {
    await fetch(`/api/rules/${id}`, { method: "DELETE" })
    setRules((prev) => prev.filter((r) => r.id !== id))
  }

  async function addRule() {
    if (!newRule.name || !newRule.description || !newRule.categoryId) return
    setAddingRule(true)
    const res = await fetch("/api/rules", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newRule),
    })
    const j = await res.json()
    if (j.success) {
      setRules((prev) => [...prev, j.data])
      setNewRule({ name: "", description: "", categoryId: "" })
    }
    setAddingRule(false)
  }

  return (
    <div className="flex flex-col p-4 gap-6 pb-24">
      {/* AI Key */}
      <div className="rounded-lg border p-4 space-y-3">
        <h2 className="text-sm font-semibold">AI 配置</h2>
        <p className="text-xs text-muted-foreground">
          用于自动分类和账单助手。在{" "}
          <a href="https://console.anthropic.com/settings/keys" target="_blank" className="underline">console.anthropic.com</a>{" "}
          获取。
        </p>
        <input
          type="password"
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          placeholder="API Key（Anthropic 或阿里云百炼）"
          className="w-full rounded border bg-background px-3 py-2 text-sm font-mono focus:outline-none focus:ring-1 focus:ring-ring"
        />
        <input
          value={baseUrl}
          onChange={(e) => setBaseUrl(e.target.value)}
          placeholder="Base URL（百炼填 https://dashscope.aliyuncs.com/compatible-mode/v1）"
          className="w-full rounded border bg-background px-3 py-2 text-sm font-mono focus:outline-none focus:ring-1 focus:ring-ring"
        />
        <input
          value={aiModel}
          onChange={(e) => setAiModel(e.target.value)}
          placeholder="模型名（如 qwen-plus、qwen-turbo）"
          className="w-full rounded border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
        />
        <button onClick={saveKey} disabled={saving || !apiKey}
          className="rounded bg-primary px-4 py-2 text-sm text-primary-foreground disabled:opacity-50">
          {saved ? "已保存" : saving ? "保存中..." : "保存"}
        </button>
      </div>

      {/* 规则管理 */}
      <div className="rounded-lg border p-4 space-y-3">
        <h2 className="text-sm font-semibold">分类规则</h2>
        <p className="text-xs text-muted-foreground">上传账单时 AI 会按规则自动打标分类。用自然语言描述规则即可。</p>

        {rules.length === 0 && <p className="text-xs text-muted-foreground">还没有规则</p>}

        <div className="space-y-2">
          {rules.map((r) => (
            <div key={r.id} className="flex items-start gap-2 rounded border p-2">
              <input type="checkbox" checked={r.enabled} onChange={(e) => toggleRule(r.id, e.target.checked)} className="mt-0.5 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium">{r.name}</p>
                <p className="text-xs text-muted-foreground truncate">{r.description}</p>
                <p className="text-xs text-primary">→ {r.category.icon} {r.category.name}</p>
              </div>
              <button onClick={() => deleteRule(r.id)} className="text-muted-foreground hover:text-destructive shrink-0">
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>

        {/* 新增规则 */}
        <div className="space-y-2 border-t pt-3">
          <input value={newRule.name} onChange={(e) => setNewRule({ ...newRule, name: e.target.value })}
            placeholder="规则名称（如：咖啡规则）"
            className="w-full rounded border px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-ring" />
          <textarea value={newRule.description} onChange={(e) => setNewRule({ ...newRule, description: e.target.value })}
            placeholder="规则描述（如：商户包含星巴克、Manner、瑞幸 → 咖啡）"
            rows={2}
            className="w-full rounded border px-2 py-1.5 text-xs resize-none focus:outline-none focus:ring-1 focus:ring-ring" />
          <select value={newRule.categoryId} onChange={(e) => setNewRule({ ...newRule, categoryId: e.target.value })}
            className="w-full rounded border bg-background px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-ring">
            <option value="">选择目标分类...</option>
            {categories.map((c) => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
          </select>
          <button onClick={addRule} disabled={addingRule || !newRule.name || !newRule.description || !newRule.categoryId}
            className="flex items-center gap-1 rounded bg-primary px-3 py-1.5 text-xs text-primary-foreground disabled:opacity-50">
            <Plus className="h-3 w-3" /> 添加规则
          </button>
        </div>
      </div>
    </div>
  )
}
