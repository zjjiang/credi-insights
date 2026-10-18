"use client"

import { useState, useRef, useEffect } from "react"
import { Button, Drawer, Input, theme } from "antd"
import { SendOutlined } from "@ant-design/icons"
import { useAi } from "@/lib/ai-context"

interface Message {
  role: "user" | "assistant"
  content: string
}

const STORAGE_KEY = "ai-chat-history"

export function AiSidebar() {
  const { isOpen, close, currentMonth } = useAi()
  const { token } = theme.useToken()
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
    } catch {
      addChunk("请求失败，请重试。")
    }

    setLoading(false)
  }

  return (
    <Drawer
      open={isOpen}
      onClose={close}
      title="AI 账单助手"
      placement="right"
      width={320}
      styles={{
        body: {
          display: "flex",
          flexDirection: "column",
          padding: 0,
          overflow: "hidden",
        },
      }}
    >
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 && (
          <p
            className="text-xs text-center pt-8"
            style={{ color: token.colorTextTertiary }}
          >
            可以问我：本月花了多少？把所有星巴克改成咖啡类？
          </p>
        )}
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
            <div
              className="max-w-[85%] px-3 py-2 text-sm whitespace-pre-wrap"
              style={{
                borderRadius: token.borderRadiusLG,
                backgroundColor:
                  m.role === "user" ? token.colorPrimary : token.colorFillTertiary,
                color: m.role === "user" ? "#fff" : token.colorText,
              }}
            >
              {m.content}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div
              className="px-3 py-2 text-sm"
              style={{
                borderRadius: token.borderRadiusLG,
                backgroundColor: token.colorFillTertiary,
                color: token.colorTextTertiary,
              }}
            >
              ...
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <div className="p-3 flex gap-2" style={{ borderTop: `1px solid ${token.colorBorderSecondary}` }}>
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onPressEnter={send}
          placeholder="问点什么..."
          disabled={loading}
        />
        <Button
          type="primary"
          icon={<SendOutlined />}
          onClick={send}
          disabled={!input.trim() || loading}
        >
          发送
        </Button>
      </div>
    </Drawer>
  )
}
