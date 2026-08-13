"use client";

import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ArrowLeft, RefreshCw, Settings, Upload, Loader2 } from "lucide-react";
import { DailyView } from "@/components/daily/DailyView";
import type { ApiCategory } from "@/lib/api-types";

interface Card {
  id: string;
  bank: string;
  cardLast4: string;
  alias: string | null;
  billingDay: number | null;
  isActive: boolean;
}

export default function CardDetailPage() {
  const params = useParams();
  const router = useRouter();
  const cardId = params.id as string;

  const [card, setCard] = useState<Card | null>(null);
  const [categories, setCategories] = useState<ApiCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const [cardRes, catRes] = await Promise.all([
          fetch(`/api/cards/${cardId}`).then((r) => r.json()),
          fetch("/api/categories").then((r) => r.json()),
        ]);
        if (cardRes.success) setCard(cardRes.data);
        if (catRes.success) setCategories(catRes.data);
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, [cardId]);

  async function handleSync() {
    setSyncing(true);
    setSyncResult(null);
    try {
      const res = await fetch(`/api/cards/${cardId}/sync`, { method: "POST" });
      const result = await res.json();

      if (result.success) {
        const { newEmails, newTransactions } = result.data;
        setSyncResult(
          `同步完成：处理 ${newEmails} 封邮件，新增 ${newTransactions} 笔交易`,
        );
        // 3秒后刷新交易列表
        setTimeout(() => {
          window.location.reload();
        }, 3000);
      } else {
        setSyncResult(`同步失败：${result.error}`);
      }
    } catch (err) {
      setSyncResult(
        `同步失败：${err instanceof Error ? err.message : "未知错误"}`,
      );
    } finally {
      setSyncing(false);
    }
  }

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setUploadError(null);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("cardId", cardId);

      const res = await fetch("/api/uploads", {
        method: "POST",
        body: formData,
      });

      const result = await res.json();
      if (result.success) {
        // 刷新页面重新加载交易
        window.location.reload();
      } else {
        setUploadError(result.error || "上传失败");
      }
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "上传失败");
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto max-w-5xl p-4">
        <p className="py-8 text-center text-sm text-muted-foreground">
          加载中...
        </p>
      </div>
    );
  }

  if (!card) {
    return (
      <div className="container mx-auto max-w-5xl p-4">
        <p className="py-8 text-center text-sm text-muted-foreground">
          卡片不存在
        </p>
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-5xl p-4">
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push("/cards")}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-xl font-semibold">
              {card.alias || `${card.bank} ${card.cardLast4}`}
            </h1>
            <p className="text-sm text-muted-foreground">
              {card.bank} • 尾号 {card.cardLast4}
              {card.billingDay && ` • 账单日 ${card.billingDay} 号`}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={handleSync}
            disabled={syncing}
            size="sm"
            variant="outline"
          >
            <RefreshCw className={`h-4 w-4 ${syncing ? "animate-spin" : ""}`} />
            <span className="ml-2">同步日推</span>
          </Button>
          <Button
            onClick={() => router.push(`/cards/${cardId}/settings`)}
            size="sm"
            variant="outline"
          >
            <Settings className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {syncResult && (
        <div
          className={`mb-4 rounded-md p-3 text-sm ${
            syncResult.includes("失败")
              ? "bg-red-50 text-red-600"
              : "bg-green-50 text-green-600"
          }`}
        >
          {syncResult}
        </div>
      )}

      {uploadError && (
        <div className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-600">
          {uploadError}
        </div>
      )}

      <DailyView categories={categories} cardId={cardId} />

      <input
        ref={fileInputRef}
        type="file"
        accept=".msg"
        className="hidden"
        onChange={handleUpload}
      />

      <Button
        onClick={() => fileInputRef.current?.click()}
        disabled={uploading}
        className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg"
        size="icon"
      >
        {uploading ? (
          <Loader2 className="h-5 w-5 animate-spin" />
        ) : (
          <Upload className="h-5 w-5" />
        )}
      </Button>
    </div>
  );
}
