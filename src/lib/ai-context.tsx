"use client"

import { createContext, useContext, useState } from "react"

interface AiContextValue {
  isOpen: boolean
  open: () => void
  close: () => void
  currentMonth: string | undefined
  setCurrentMonth: (m: string | undefined) => void
}

const AiContext = createContext<AiContextValue | null>(null)

export function AiProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false)
  const [currentMonth, setCurrentMonth] = useState<string | undefined>()
  return (
    <AiContext.Provider value={{ isOpen, open: () => setIsOpen(true), close: () => setIsOpen(false), currentMonth, setCurrentMonth }}>
      {children}
    </AiContext.Provider>
  )
}

export function useAi() {
  const ctx = useContext(AiContext)
  if (!ctx) throw new Error("useAi must be used within AiProvider")
  return ctx
}
