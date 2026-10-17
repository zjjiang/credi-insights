"use client";

import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { Alert, Button, Card, Select, Tabs, Typography } from "antd";
import {
  ArrowLeftOutlined,
  SettingOutlined,
  SyncOutlined,
  UploadOutlined,
  DownloadOutlined,
} from "@ant-design/icons";
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

type DetailTab = "active" | "history";

function uploadPeriodLabel(upload: ApiUpload): string {
  if (upload.billingStart && upload.billingEnd) {
    return `${upload.billingStart.slice(0, 10)} ~ ${upload.billingEnd.slice(0, 10)}`;
  }
  return upload.imageMonth ?? upload.originalName;
}

/** 该卡活跃流水的日期下限：所有已完成且账期解析成功账单中最大的 billingEnd。 */
function computeCutoffDate(uploads: ApiUpload[]): string {
  return uploads
    .filter((u) => u.status === "DONE" && u.billingEnd)
    .reduce((max, u) => {
      const end = u.billingEnd!.slice(0, 10);
      return end > max ? end : max;
    }, "");
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

  const [tab, setTab] = useState<DetailTab>("active");
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
        <p className="py-8 text-center text-sm text-gray-500">加载中...</p>
      </div>
    );
  }

  if (!card) {
    return (
      <div className="container mx-auto max-w-3xl p-4">
        <p className="py-8 text-center text-sm text-gray-500">卡片不存在</p>
      </div>
    );
  }

  const cutoffDate = computeCutoffDate(uploads);

  const tabItems = [
    {
      key: "active",
      label: "活跃流水",
      children: (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <Button
              icon={<SyncOutlined />}
              onClick={handleSync}
              loading={syncing}
            >
              同步日推
            </Button>
          </div>

          {syncResult && (
            <Alert
              showIcon
              type={syncResult.ok ? "success" : "error"}
              message={syncResult.ok ? "同步完成" : "同步失败"}
              description={syncResult.message}
            />
          )}

          <DailyView
            categories={categories}
            cardId={cardId}
            since={cutoffDate || undefined}
          />
        </div>
      ),
    },
    {
      key: "history",
      label: "历史账单",
      children: (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <Button
              icon={<UploadOutlined />}
              onClick={() => fileInputRef.current?.click()}
              loading={uploading}
            >
              上传月账单
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".msg"
              className="hidden"
              onChange={handleUpload}
            />
          </div>

          {uploadError && (
            <Alert showIcon type="error" message={`上传失败：${uploadError}`} />
          )}

          {uploads.length === 0 ? (
            <p className="py-8 text-center text-sm text-gray-500">
              还没有任何账单
            </p>
          ) : (
            <Card title="账单周期">
              <div className="space-y-3">
                <Select
                  value={selectedUploadId}
                  onChange={(value) => {
                    setSelectedUploadId(value);
                    setReclassifyResult(null);
                    setReclassifyError(null);
                  }}
                  options={uploads.map((u) => ({
                    value: u.id,
                    label: uploadPeriodLabel(u),
                  }))}
                  style={{ width: "100%" }}
                />

                {(() => {
                  const selectedUpload = uploads.find(
                    (u) => u.id === selectedUploadId,
                  );
                  const notDone = selectedUpload?.status !== "DONE";
                  return (
                    <div className="flex flex-wrap gap-2">
                      <Button
                        size="small"
                        icon={<DownloadOutlined />}
                        onClick={handleDownloadReport}
                        loading={downloading}
                        disabled={notDone}
                      >
                        下载报告
                      </Button>
                      <Button
                        size="small"
                        icon={<SyncOutlined />}
                        onClick={handleReclassify}
                        loading={reclassifying}
                      >
                        重新分类
                      </Button>
                    </div>
                  );
                })()}

                {reclassifyResult !== null && (
                  <Typography.Text type="success" className="text-xs">
                    已分类 {reclassifyResult} 笔
                  </Typography.Text>
                )}
                {reclassifyError && (
                  <Typography.Text type="danger" className="text-xs">
                    {reclassifyError}
                  </Typography.Text>
                )}

                {selectedUploadId && (
                  <UploadPeriodPanel
                    key={selectedUploadId}
                    uploadId={selectedUploadId}
                    categories={categories}
                  />
                )}
              </div>
            </Card>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="container mx-auto max-w-3xl space-y-4 p-4">
      <div className="flex items-center gap-3">
        <Button
          type="link"
          icon={<ArrowLeftOutlined />}
          onClick={() => router.push("/")}
          aria-label="返回首页"
        />
        <div className="min-w-0 flex-1">
          <Typography.Title level={4} ellipsis style={{ marginBottom: 0 }}>
            {card.alias || `${card.bank} ${card.cardLast4}`}
          </Typography.Title>
          <Typography.Text type="secondary" className="block truncate text-sm">
            {card.bank} · 尾号 {card.cardLast4}
            {card.billingDay && ` · 账单日 ${card.billingDay} 号`}
          </Typography.Text>
        </div>
        <Button
          type="text"
          icon={<SettingOutlined />}
          onClick={() => router.push(`/cards/${cardId}/settings`)}
          aria-label="卡片设置"
        />
      </div>

      <Card title="本月概览">
        <div className="flex items-end justify-between gap-4">
          <div>
            <Typography.Text type="secondary" className="text-xs">
              本月支出
            </Typography.Text>
            <p className="text-2xl font-semibold tabular-nums">
              ¥{formatCurrency(card.stats.monthlyTotal)}
            </p>
          </div>
          <Typography.Text type="secondary" className="text-right text-xs">
            最近同步
            <br />
            {formatSyncTime(card.stats.lastSyncAt)}
          </Typography.Text>
        </div>
      </Card>

      <Tabs
        activeKey={tab}
        onChange={(key) => setTab(key as DetailTab)}
        items={tabItems}
      />
    </div>
  );
}
