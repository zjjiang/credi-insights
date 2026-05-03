"use client"

import { useAi } from "@/lib/ai-context"
import { MessageCircle } from "lucide-react"

export function AiToggleButton() {
  const { isOpen, open } = useAi()
  if (isOpen) return null
  return (
    <button
      onClick={open}
      className="fixed bottom-36 right-4 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-secondary text-secondary-foreground shadow-lg"
      aria-label="打开AI助手"
    >
      <MessageCircle className="h-5 w-5" />
    </button>
  )
}
