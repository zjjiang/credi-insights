"use client";

import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ArrowLeft,
  RefreshCw,
  Settings,
  Upload,
  Loader2,
  CheckCircle2,
  XCircle,
  Download,
} from "lucide-react";
import { DailyView } from "@/components/daily/DailyView";
import { UploadPeriodPanel } from "@/components/cards/UploadPeriodPanel";
import type { ApiCategory, ApiUpload } from "@/lib/api-types";

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

function uploadPeriodLabel(upload: ApiUpload): string {
  if (upload.billingStart && upload.billingEnd) {
    return `${upload.billingStart.slice(0, 10)} ~ ${upload.billingEnd.slice(0, 10)}`;
  }
  return upload.imageMonth ?? upload.originalName;
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

  const [uploads, setUploads] = useState<ApiUpload[]>([]);
  const [selectedUploadId, setSelectedUploadId] = useState<string>("");
  const [downloading, setDownloading] = useState(false);
  const [reclassifying, setReclassifying] = useState(false);
  const [reclassifyResult, setReclassifyResult] = useState<number | null>(null);
  const [reclassifyError, setReclassifyError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    try {
      const [cardRes, catRes, uploadsRes] = await Promise.all([
        fetch(`/api/cards/${cardId}`).then((r) => r.json()),
        fetch("/api/categories").then((r) => r.json()),
        fetch(`/api/cards/${cardId}/uploads`).then((r) => r.json()),
      ]);
      if (cardRes.success) setCard(cardRes.data);
      if (catRes.success) setCategories(catRes.data);
      if (uploadsRes.success) {
        setUploads(uploadsRes.data);
        setSelectedUploadId((prev) => prev || uploadsRes.data[0]?.id || "");
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleDownloadReport() {
    if (!selectedUploadId) return;
    setDownloading(true);
    try {
      const res = await fetch(`/api/uploads/${selectedUploadId}/report`, {
        cache: "no-store",
      });
      if (!res.ok) throw new Error("下载失败");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const selectedUpload = uploads.find((u) => u.id === selectedUploadId);
      const a = document.createElement("a");
      a.href = url;
      a.download = `消费报告_${selectedUpload?.billingStart?.slice(0, 10) ?? selectedUpload?.imageMonth ?? "report"}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      // silent
    }
    setDownloading(false);
  }

  async function handleReclassify() {
    if (!selectedUploadId) return;
    setReclassifying(true);
    setReclassifyResult(null);
    setReclassifyError(null);
    const res = await fetch(`/api/uploads/${selectedUploadId}/reclassify`, {
      method: "POST",
    });
    const json = await res.json();
    if (json.success) {
      setReclassifyResult(json.data.classified);
    } else {
      setReclassifyError(json.error ?? "分类失败");
    }
    setReclassifying(false);
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
          <span>
            {syncResult.ok ? "同步完成：" : "同步失败："}
            {syncResult.message}
          </span>
        </div>
      )}

      {uploadError && (
        <div className="flex items-center gap-2 rounded-md bg-red-50 p-3 text-sm text-red-600 dark:bg-red-950/30 dark:text-red-400">
          <XCircle className="h-4 w-4 shrink-0" />
          <span>上传失败：{uploadError}</span>
        </div>
      )}

      {uploads.length > 0 && (
        <Card>
          <CardHeader className="pb-0">
            <CardTitle>账单周期</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <select
              value={selectedUploadId}
              onChange={(e) => {
                setSelectedUploadId(e.target.value);
                setReclassifyResult(null);
                setReclassifyError(null);
              }}
              className="w-full rounded border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
            >
              {uploads.map((u) => (
                <option key={u.id} value={u.id}>
                  {uploadPeriodLabel(u)}
                </option>
              ))}
            </select>

            {(() => {
              const selectedUpload = uploads.find(
                (u) => u.id === selectedUploadId,
              );
              const notDone = selectedUpload?.status !== "DONE";
              return (
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleDownloadReport}
                    disabled={downloading || notDone}
                  >
                    <Download
                      className={`h-3.5 w-3.5 ${downloading ? "animate-bounce" : ""}`}
                    />
                    <span className="ml-1.5">
                      {downloading ? "生成中..." : "下载报告"}
                    </span>
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleReclassify}
                    disabled={reclassifying}
                  >
                    <RefreshCw
                      className={`h-3.5 w-3.5 ${reclassifying ? "animate-spin" : ""}`}
                    />
                    <span className="ml-1.5">
                      {reclassifying ? "分类中..." : "重新分类"}
                    </span>
                  </Button>
                </div>
              );
            })()}

            {reclassifyResult !== null && (
              <p className="text-xs text-green-600">
                已分类 {reclassifyResult} 笔
              </p>
            )}
            {reclassifyError && (
              <p className="text-xs text-destructive">{reclassifyError}</p>
            )}

            {selectedUploadId && (
              <UploadPeriodPanel
                key={selectedUploadId}
                uploadId={selectedUploadId}
                categories={categories}
              />
            )}
          </CardContent>
        </Card>
      )}

      <DailyView categories={categories} cardId={cardId} />
    </div>
  );
}
