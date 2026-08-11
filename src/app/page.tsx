"use client";

import { useState, useEffect, useCallback } from "react";
import { MsgDropzone } from "@/components/upload/MsgDropzone";
import { UploadBatchCard } from "@/components/history/UploadBatchCard";
import { DailyView } from "@/components/daily/DailyView";
import type { ApiUpload, ApiCategory } from "@/lib/api-types";

type Tab = "daily" | "bills";

export default function HomePage() {
  const [tab, setTab] = useState<Tab>("daily");
  const [uploads, setUploads] = useState<ApiUpload[]>([]);
  const [categories, setCategories] = useState<ApiCategory[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    const [u, c] = await Promise.all([
      fetch("/api/uploads").then((r) => r.json()),
      fetch("/api/categories").then((r) => r.json()),
    ]);
    if (u.success) setUploads(u.data);
    if (c.success) setCategories(c.data);
    setLoading(false);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- 挂载时拉取数据
    void loadData();
  }, [loadData]);

  return (
    <div className="flex flex-col p-4 gap-4">
      <div className="flex gap-1 rounded-lg bg-muted p-1">
        <TabButton active={tab === "daily"} onClick={() => setTab("daily")}>
          按日
        </TabButton>
        <TabButton active={tab === "bills"} onClick={() => setTab("bills")}>
          月账单
        </TabButton>
      </div>

      {tab === "daily" ? (
        <DailyView categories={categories} />
      ) : (
        <>
          <MsgDropzone onUpload={() => loadData()} />
          {loading ? (
            <p className="text-center text-sm text-muted-foreground py-8">
              加载中...
            </p>
          ) : uploads.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground py-8">
              还没有账单，上传第一份吧
            </p>
          ) : (
            <div className="flex flex-col gap-3">
              {uploads.map((u) => (
                <UploadBatchCard
                  key={u.id}
                  batch={u}
                  categories={categories}
                  onDeleted={(id) =>
                    setUploads((prev) => prev.filter((x) => x.id !== id))
                  }
                />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
        active
          ? "bg-background text-foreground shadow-sm"
          : "text-muted-foreground hover:text-foreground"
      }`}
    >
      {children}
    </button>
  );
}
