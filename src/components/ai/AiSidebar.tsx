"use client"

import { useState, useRef, useEffect } from "react"
import { useAi } from "@/lib/ai-context"
import { X } from "lucide-react"

interface Message {
  role: "user" | "assistant"
  content: string
}

const STORAGE_KEY = "ai-chat-history"

export function AiSidebar() {
  const { isOpen, close, currentMonth } = useAi()
  const [messages, setMessages] = useState<Message[]>(() => {
    if (typeof window === "undefined") return []
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]") } catch { return [] }
  })
  const [input, setInput] = useState("")
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(messages.slice(-50)))
    }
  }, [messages])

  async function send() {
    const text = input.trim()
    if (!text || loading) return
    setInput("")
    const userMsg: Message = { role: "user", content: text }
    const newMessages = [...messages, userMsg]
    setMessages(newMessages)
    setLoading(true)

    let assistantText = ""
    const addChunk = (chunk: string) => {
      assistantText += chunk
      setMessages([...newMessages, { role: "assistant", content: assistantText }])
    }

    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: newMessages.map((m) => ({ role: m.role, content: m.content })),
          context: { currentMonth },
        }),
      })

      const reader = res.body?.getReader()
      const dec = new TextDecoder()
      if (!reader) throw new Error("No response body")

      let buf = ""
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buf += dec.decode(value, { stream: true })
        const lines = buf.split("\n")
        buf = lines.pop() ?? ""
        for (const line of lines) {
          if (!line.startsWith("data: ")) continue
          const raw = line.slice(6)
          if (raw === "[DONE]") break
          try {
            const evt = JSON.parse(raw)
            if (evt.type === "text") addChunk(evt.delta)
            else if (evt.type === "tool_result" && evt.name === "bulk_update_category") {
              addChunk(`\n\n已批量修改 ${evt.result?.affected ?? 0} 笔交易。`)
            }
          } catch { /* skip */ }
        }
      }
    } catch (e) {
      addChunk("请求失败，请重试。")
    }

    setLoading(false)
  }

  if (!isOpen) return null

  return (
    <div className="fixed right-0 top-0 z-50 flex h-full w-80 flex-col border-l bg-background shadow-xl">
      <div className="flex items-center justify-between border-b px-4 py-3">
        <span className="font-medium text-sm">AI 账单助手</span>
        <button onClick={close} className="text-muted-foreground hover:text-foreground">
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 && (
          <p className="text-xs text-muted-foreground text-center pt-8">
            可以问我：本月花了多少？把所有星巴克改成咖啡类？
          </p>
        )}
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
            <div className={`max-w-[85%] rounded-lg px-3 py-2 text-sm whitespace-pre-wrap ${
              m.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted"
            }`}>
              {m.content}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-muted rounded-lg px-3 py-2 text-sm text-muted-foreground">...</div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <div className="border-t p-3 flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && send()}
          placeholder="问点什么..."
          className="flex-1 rounded border bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
          disabled={loading}
        />
        <button
          onClick={send}
          disabled={!input.trim() || loading}
          className="rounded bg-primary px-3 py-1.5 text-sm text-primary-foreground disabled:opacity-50"
        >
          发送
        </button>
      </div>
    </div>
  )
}
