"use client"

import { useState, useEffect, useCallback } from "react"
import { MsgDropzone } from "@/components/upload/MsgDropzone"
import { UploadBatchCard } from "@/components/history/UploadBatchCard"
import type { ApiUpload, ApiCategory } from "@/lib/api-types"

export default function HomePage() {
  const [uploads, setUploads] = useState<ApiUpload[]>([])
  const [categories, setCategories] = useState<ApiCategory[]>([])
  const [loading, setLoading] = useState(true)

  const loadData = useCallback(async () => {
    const [u, c] = await Promise.all([
      fetch("/api/uploads").then((r) => r.json()),
      fetch("/api/categories").then((r) => r.json()),
    ])
    if (u.success) setUploads(u.data)
    if (c.success) setCategories(c.data)
    setLoading(false)
  }, [])

  useEffect(() => { loadData() }, [loadData])

  return (
    <div className="flex flex-col p-4 gap-4">
      <MsgDropzone onUpload={() => loadData()} />
      {loading ? (
        <p className="text-center text-sm text-muted-foreground py-8">加载中...</p>
      ) : uploads.length === 0 ? (
        <p className="text-center text-sm text-muted-foreground py-8">还没有账单，上传第一份吧</p>
      ) : (
        <div className="flex flex-col gap-3">
          {uploads.map((u) => (
            <UploadBatchCard
              key={u.id}
              batch={u}
              categories={categories}
              onDeleted={(id) => setUploads((prev) => prev.filter((x) => x.id !== id))}
            />
          ))}
        </div>
      )}
    </div>
  )
}
