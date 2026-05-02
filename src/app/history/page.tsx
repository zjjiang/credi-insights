"use client";

import { useState, useEffect, useCallback } from "react";
import { UploadBatchCard } from "@/components/history/UploadBatchCard";
import type { ApiUpload, ApiCategory } from "@/lib/api-types";

export default function HistoryPage() {
  const [batches, setBatches] = useState<ApiUpload[]>([]);
  const [categories, setCategories] = useState<ApiCategory[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const [uploadsRes, catsRes] = await Promise.all([
      fetch("/api/uploads"),
      fetch("/api/categories"),
    ]);
    const uploadsJson = await uploadsRes.json();
    const catsJson = await catsRes.json();
    if (uploadsJson.success) setBatches(uploadsJson.data);
    if (catsJson.success) setCategories(catsJson.data);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center p-4">
        <p className="text-sm text-muted-foreground">加载中...</p>
      </div>
    );
  }

  if (batches.length === 0) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center p-4">
        <p className="text-sm text-muted-foreground">暂无记录</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 p-4">
      <h1 className="text-xl font-semibold">历史记录</h1>
      {batches.map((batch) => (
        <UploadBatchCard
          key={batch.id}
          batch={batch}
          categories={categories}
          onDeleted={(id) => setBatches((prev) => prev.filter((b) => b.id !== id))}
        />
      ))}
    </div>
  );
}
