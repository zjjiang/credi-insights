"use client"

import { useRef, useState } from "react"
import { Plus, Loader2 } from "lucide-react"

interface MsgDropzoneProps {
  onUpload: () => void
}

export function MsgDropzone({ onUpload }: MsgDropzoneProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState("")

  async function upload(file: File) {
    if (!file.name.endsWith(".msg")) { setError("请选择 .msg 文件"); return }
    setUploading(true); setError("")
    const fd = new FormData()
    fd.append("file", file)
    const res = await fetch("/api/uploads", { method: "POST", body: fd })
    const json = await res.json()
    setUploading(false)
    if (json.success) { onUpload() }
    else { setError(json.error ?? "上传失败") }
  }

  return (
    <>
      <input ref={inputRef} type="file" accept=".msg" className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) upload(f); e.target.value = "" }} />

      {error && (
        <div className="fixed bottom-24 left-4 right-4 rounded-lg bg-destructive/10 border border-destructive/30 px-3 py-2 text-xs text-destructive z-40"
          onClick={() => setError("")}>
          {error}
        </div>
      )}

      <button
        onClick={() => !uploading && inputRef.current?.click()}
        disabled={uploading}
        className="fixed bottom-20 right-4 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg disabled:opacity-70"
        aria-label="上传账单"
      >
        {uploading ? <Loader2 className="h-6 w-6 animate-spin" /> : <Plus className="h-6 w-6" />}
      </button>
    </>
  )
}
