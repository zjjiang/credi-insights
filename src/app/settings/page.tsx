"use client"

import { useState, useEffect } from "react"
import { Trash2, Plus, Pencil, Check, X } from "lucide-react"
import type { ApiCategory } from "@/lib/api-types"

interface ApiRule {
  id: string
  name: string
  description: string
  categoryId: string
  category: ApiCategory
  enabled: boolean
}

type SettingsTab = "ai" | "categories" | "rules"

export default function SettingsPage() {
  const [tab, setTab] = useState<SettingsTab>("ai")

  const [apiKey, setApiKey] = useState("")
  const [baseUrl, setBaseUrl] = useState("")
  const [aiModel, setAiModel] = useState("")
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const [categories, setCategories] = useState<ApiCategory[]>([])
  const [newCat, setNewCat] = useState({ name: "", icon: "", color: "#6366f1" })
  const [addingCat, setAddingCat] = useState(false)
  const [editingCat, setEditingCat] = useState<string | null>(null)
  const [editCatForm, setEditCatForm] = useState({ name: "", icon: "", color: "" })

  const [rules, setRules] = useState<ApiRule[]>([])
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

  async function addCategory() {
    if (!newCat.name) return
    setAddingCat(true)
    const res = await fetch("/api/categories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newCat),
    })
    const j = await res.json()
    if (j.success) {
      setCategories((prev) => [...prev, j.data])
      setNewCat({ name: "", icon: "", color: "#6366f1" })
    }
    setAddingCat(false)
  }

  function startEditCat(c: ApiCategory) {
    setEditingCat(c.id)
    setEditCatForm({ name: c.name, icon: c.icon ?? "", color: c.color ?? "#6366f1" })
  }

  async function saveEditCat(id: string) {
    await fetch(`/api/categories/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(editCatForm),
    })
    setCategories((prev) => prev.map((c) => c.id === id ? { ...c, ...editCatForm } : c))
    setEditingCat(null)
  }

  async function deleteCat(id: string) {
    await fetch(`/api/categories/${id}`, { method: "DELETE" })
    setCategories((prev) => prev.filter((c) => c.id !== id))
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
    <div className="flex flex-col p-4 gap-4 pb-24">
      <div className="flex rounded-lg border overflow-hidden text-xs">
        <button onClick={() => setTab("ai")}
          className={`flex-1 py-1.5 ${tab === "ai" ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}>
          AI 配置
        </button>
        <button onClick={() => setTab("categories")}
          className={`flex-1 py-1.5 ${tab === "categories" ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}>
          分类
        </button>
        <button onClick={() => setTab("rules")}
          className={`flex-1 py-1.5 ${tab === "rules" ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}>
          规则
        </button>
      </div>

      {tab === "ai" && (
        <div className="rounded-lg border p-4 space-y-3">
          <h2 className="text-sm font-semibold">AI 配置</h2>
          <p className="text-xs text-muted-foreground">用于自动分类和账单助手。支持 Anthropic、阿里云百炼等 OpenAI 兼容接口。</p>
          <input type="password" value={apiKey} onChange={(e) => setApiKey(e.target.value)}
            placeholder="API Key"
            className="w-full rounded border bg-background px-3 py-2 text-sm font-mono focus:outline-none focus:ring-1 focus:ring-ring" />
          <input value={baseUrl} onChange={(e) => setBaseUrl(e.target.value)}
            placeholder="Base URL（如 https://dashscope.aliyuncs.com/compatible-mode/v1）"
            className="w-full rounded border bg-background px-3 py-2 text-sm font-mono focus:outline-none focus:ring-1 focus:ring-ring" />
          <input value={aiModel} onChange={(e) => setAiModel(e.target.value)}
            placeholder="模型名（如 qwen-plus）"
            className="w-full rounded border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring" />
          <button onClick={saveKey} disabled={saving || !apiKey}
            className="rounded bg-primary px-4 py-2 text-sm text-primary-foreground disabled:opacity-50">
            {saved ? "已保存" : saving ? "保存中..." : "保存"}
          </button>
        </div>
      )}

      {tab === "categories" && (
        <div className="rounded-lg border p-4 space-y-3">
          <h2 className="text-sm font-semibold">分类管理</h2>
          {categories.length === 0 && <p className="text-xs text-muted-foreground">还没有分类</p>}
          <div className="space-y-2">
            {categories.map((c) => (
              <div key={c.id} className="flex items-center gap-2 rounded border p-2">
                {editingCat === c.id ? (
                  <>
                    <input value={editCatForm.icon} onChange={(e) => setEditCatForm({ ...editCatForm, icon: e.target.value })}
                      placeholder="图标" className="w-10 rounded border px-1 py-0.5 text-center text-sm focus:outline-none focus:ring-1 focus:ring-ring" />
                    <input value={editCatForm.name} onChange={(e) => setEditCatForm({ ...editCatForm, name: e.target.value })}
                      className="flex-1 rounded border px-2 py-0.5 text-xs focus:outline-none focus:ring-1 focus:ring-ring" />
                    <input type="color" value={editCatForm.color} onChange={(e) => setEditCatForm({ ...editCatForm, color: e.target.value })}
                      className="h-6 w-6 rounded border-0 p-0" />
                    <button onClick={() => saveEditCat(c.id)} className="text-green-600"><Check className="h-3.5 w-3.5" /></button>
                    <button onClick={() => setEditingCat(null)} className="text-muted-foreground"><X className="h-3.5 w-3.5" /></button>
                  </>
                ) : (
                  <>
                    <span className="w-6 h-6 rounded" style={{ background: c.color ?? "#6366f1" }} />
                    <span className="text-sm">{c.icon}</span>
                    <span className="flex-1 text-xs font-medium">{c.name}</span>
                    <button onClick={() => startEditCat(c)} className="text-muted-foreground hover:text-foreground">
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button onClick={() => deleteCat(c.id)} className="text-muted-foreground hover:text-destructive">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </>
                )}
              </div>
            ))}
          </div>
          <div className="space-y-2 border-t pt-3">
            <div className="flex gap-2">
              <input value={newCat.icon} onChange={(e) => setNewCat({ ...newCat, icon: e.target.value })}
                placeholder="图标" className="w-12 rounded border px-2 py-1.5 text-center text-sm focus:outline-none focus:ring-1 focus:ring-ring" />
              <input value={newCat.name} onChange={(e) => setNewCat({ ...newCat, name: e.target.value })}
                placeholder="分类名称" className="flex-1 rounded border px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-ring" />
              <input type="color" value={newCat.color} onChange={(e) => setNewCat({ ...newCat, color: e.target.value })}
                className="h-8 w-8 rounded border-0 p-0" />
            </div>
            <button onClick={addCategory} disabled={addingCat || !newCat.name}
              className="flex items-center gap-1 rounded bg-primary px-3 py-1.5 text-xs text-primary-foreground disabled:opacity-50">
              <Plus className="h-3 w-3" /> 新增分类
            </button>
          </div>
        </div>
      )}

      {tab === "rules" && (
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
      )}
    </div>
  )
}
