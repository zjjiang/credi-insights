"use client";

import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ArrowLeft,
  RefreshCw,
  Settings,
  Upload,
  Loader2,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import { DailyView } from "@/components/daily/DailyView";
import type { ApiCategory } from "@/lib/api-types";

interface CardDetail {
  id: string;
  bank: string;
  cardLast4: string;
  alias: string | null;
  billingDay: number | null;
  isActive: boolean;
  stats: {
    monthlyTotal: number;
    lastSyncAt: string | null;
    transactionCount: number;
  };
}

function formatCurrency(n: number): string {
  return n.toLocaleString("zh-CN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatSyncTime(iso: string | null): string {
  if (!iso) return "尚未同步";
  return new Date(iso).toLocaleString("zh-CN", {
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function CardDetailPage() {
  const params = useParams();
  const router = useRouter();
  const cardId = params.id as string;

  const [card, setCard] = useState<CardDetail | null>(null);
  const [categories, setCategories] = useState<ApiCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<{
    ok: boolean;
    message: string;
  } | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cardId]);

  async function handleSync() {
    setSyncing(true);
    setSyncResult(null);
    try {
      const res = await fetch(`/api/cards/${cardId}/sync`, { method: "POST" });
      const result = await res.json();

      if (result.success) {
        const { newEmails, newTransactions } = result.data;
        setSyncResult({
          ok: true,
          message: `处理 ${newEmails} 封邮件，新增 ${newTransactions} 笔交易`,
        });
        await load();
      } else {
        setSyncResult({ ok: false, message: result.error });
      }
    } catch (err) {
      setSyncResult({
        ok: false,
        message: err instanceof Error ? err.message : "未知错误",
      });
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
        await load();
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
      <div className="container mx-auto max-w-3xl p-4">
        <p className="py-8 text-center text-sm text-muted-foreground">
          加载中...
        </p>
      </div>
    );
  }

  if (!card) {
    return (
      <div className="container mx-auto max-w-3xl p-4">
        <p className="py-8 text-center text-sm text-muted-foreground">
          卡片不存在
        </p>
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-3xl space-y-4 p-4">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon-sm" onClick={() => router.push("/")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-lg font-semibold">
            {card.alias || `${card.bank} ${card.cardLast4}`}
          </h1>
          <p className="truncate text-sm text-muted-foreground">
            {card.bank} · 尾号 {card.cardLast4}
            {card.billingDay && ` · 账单日 ${card.billingDay} 号`}
          </p>
        </div>
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => router.push(`/cards/${cardId}/settings`)}
          aria-label="卡片设置"
        >
          <Settings className="h-4 w-4" />
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-0">
          <CardTitle>本月概览</CardTitle>
        </CardHeader>
        <CardContent className="flex items-end justify-between gap-4">
          <div>
            <p className="text-xs text-muted-foreground">本月支出</p>
            <p className="text-2xl font-semibold tabular-nums">
              ¥{formatCurrency(card.stats.monthlyTotal)}
            </p>
          </div>
          <p className="text-right text-xs text-muted-foreground">
            最近同步
            <br />
            {formatSyncTime(card.stats.lastSyncAt)}
          </p>
        </CardContent>
      </Card>

      <div className="flex flex-wrap gap-2">
        <Button onClick={handleSync} disabled={syncing} variant="outline">
          <RefreshCw className={`h-4 w-4 ${syncing ? "animate-spin" : ""}`} />
          <span className="ml-1.5">同步日推</span>
        </Button>
        <Button
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          variant="outline"
        >
          {uploading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Upload className="h-4 w-4" />
          )}
          <span className="ml-1.5">上传月账单</span>
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".msg"
          className="hidden"
          onChange={handleUpload}
        />
      </div>

      {syncResult && (
        <div
          className={`flex items-center gap-2 rounded-md p-3 text-sm ${
            syncResult.ok
              ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400"
              : "bg-red-50 text-red-600 dark:bg-red-950/30 dark:text-red-400"
          }`}
        >
          {syncResult.ok ? (
            <CheckCircle2 className="h-4 w-4 shrink-0" />
          ) : (
            <XCircle className="h-4 w-4 shrink-0" />
          )}
          <span>{syncResult.ok ? "同步完成：" : "同步失败："}{syncResult.message}</span>
        </div>
      )}

      {uploadError && (
        <div className="flex items-center gap-2 rounded-md bg-red-50 p-3 text-sm text-red-600 dark:bg-red-950/30 dark:text-red-400">
          <XCircle className="h-4 w-4 shrink-0" />
          <span>上传失败：{uploadError}</span>
        </div>
      )}

      <DailyView categories={categories} cardId={cardId} />
    </div>
  );
}
