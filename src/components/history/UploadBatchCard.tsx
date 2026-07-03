"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronUp, Trash2, RefreshCw, Download } from "lucide-react";
import { TransactionList } from "@/components/transactions/TransactionList";
import { SpendingPieChart } from "@/components/dashboard/SpendingPieChart";
import type {
  ApiUpload,
  ApiTransaction,
  ApiCategory,
  DashboardData,
} from "@/lib/api-types";

interface UploadBatchCardProps {
  batch: ApiUpload;
  categories: ApiCategory[];
  onDeleted: (id: string) => void;
}

export function UploadBatchCard({
  batch,
  categories,
  onDeleted,
}: UploadBatchCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [tab, setTab] = useState<"list" | "uncategorized" | "top" | "stats">(
    "list",
  );
  const [transactions, setTransactions] = useState<ApiTransaction[]>(
    batch.transactions ?? [],
  );
  const [loadingTx, setLoadingTx] = useState(false);
  const [stats, setStats] = useState<DashboardData | null>(null);
  const [loadingStats, setLoadingStats] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [reclassifying, setReclassifying] = useState(false);
  const [reclassifyResult, setReclassifyResult] = useState<number | null>(null);
  const [reclassifyError, setReclassifyError] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);
  const [expandedMerchant, setExpandedMerchant] = useState<string | null>(null);
  const [assigningMerchant, setAssigningMerchant] = useState<string | null>(
    null,
  );

  const uncategorized = transactions.filter((t) => !t.categoryId);
  const merchantGroups = Array.from(
    uncategorized.reduce((map, t) => {
      const cur = map.get(t.merchant) ?? {
        count: 0,
        totalAmount: 0,
        lastDate: "",
        ids: [] as string[],
      };
      const amt =
        typeof t.amount === "string" ? parseFloat(t.amount) : t.amount;
      const date = t.txDate?.slice(0, 10) ?? "";
      map.set(t.merchant, {
        count: cur.count + 1,
        totalAmount: cur.totalAmount + amt,
        lastDate: date > cur.lastDate ? date : cur.lastDate,
        ids: [...cur.ids, t.id],
      });
      return map;
    }, new Map<string, { count: number; totalAmount: number; lastDate: string; ids: string[] }>()),
  )
    .map(([merchant, v]) => ({ merchant, ...v }))
    .sort((a, b) => b.totalAmount - a.totalAmount);

  const periodLabel =
    batch.billingStart && batch.billingEnd
      ? `${batch.billingStart.slice(0, 10)} ~ ${batch.billingEnd.slice(0, 10)}`
      : (batch.imageMonth ?? batch.originalName);

  async function handleExpand() {
    if (!expanded) {
      if (transactions.length === 0) {
        setLoadingTx(true);
        const res = await fetch(`/api/uploads/${batch.id}/transactions`);
        const json = await res.json();
        if (json.success) setTransactions(json.data);
        setLoadingTx(false);
      }
    }
    setExpanded((v) => !v);
  }

  async function handleTabStats() {
    setTab("stats");
    if (!stats) {
      setLoadingStats(true);
      const res = await fetch(`/api/dashboard?uploadId=${batch.id}`);
      const json = await res.json();
      if (json.success) setStats(json.data);
      setLoadingStats(false);
    }
  }

  async function handleReclassify() {
    setReclassifying(true);
    setReclassifyResult(null);
    setReclassifyError(null);
    const res = await fetch(`/api/uploads/${batch.id}/reclassify`, {
      method: "POST",
    });
    const json = await res.json();
    if (json.success) {
      setReclassifyResult(json.data.classified);
      const txRes = await fetch(`/api/uploads/${batch.id}/transactions`);
      const txJson = await txRes.json();
      if (txJson.success) setTransactions(txJson.data);
    } else {
      setReclassifyError(json.error ?? "分类失败");
    }
    setReclassifying(false);
  }

  async function assignCategory(
    merchant: string,
    ids: string[],
    categoryId: string,
  ) {
    setAssigningMerchant(merchant);
    const res = await fetch("/api/transactions/bulk", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids, categoryId }),
    });
    const json = await res.json();
    if (json.success) {
      setTransactions((prev) =>
        prev.map((t) => (ids.includes(t.id) ? { ...t, categoryId } : t)),
      );
    }
    setAssigningMerchant(null);
    setExpandedMerchant(null);
  }

  async function handleDelete() {
    if (!confirmed) {
      setConfirmed(true);
      return;
    }
    setDeleting(true);
    await fetch(`/api/uploads/${batch.id}`, { method: "DELETE" });
    onDeleted(batch.id);
  }

  async function handleDownloadReport() {
    setDownloading(true);
    try {
      const res = await fetch(`/api/uploads/${batch.id}/report`, {
        cache: "no-store",
      });
      if (!res.ok) throw new Error("下载失败");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `消费报告_${batch.billingStart?.slice(0, 10) ?? batch.imageMonth ?? "report"}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      // silent
    }
    setDownloading(false);
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <div className="flex flex-col gap-1">
            <CardTitle className="text-sm">{periodLabel}</CardTitle>
            <div className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
              {batch.cardLast4 && <span>尾号 {batch.cardLast4}</span>}
              {batch.dueDate && (
                <span>· 还款日 {batch.dueDate.slice(0, 10)}</span>
              )}
            </div>
          </div>
          <div className="flex flex-col items-end gap-1">
            <span
              className={`text-xs font-medium ${
                batch.status === "DONE"
                  ? "text-green-600"
                  : batch.status === "FAILED"
                    ? "text-destructive"
                    : "text-muted-foreground"
              }`}
            >
              {batch.status === "DONE"
                ? "完成"
                : batch.status === "FAILED"
                  ? "失败"
                  : "处理中"}
            </span>
            <span className="text-xs text-muted-foreground">
              {batch.txCount} 笔
            </span>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {reclassifyResult !== null && (
          <p className="mb-2 text-xs text-green-600">
            已分类 {reclassifyResult} 笔
          </p>
        )}
        {reclassifyError && (
          <p className="mb-2 text-xs text-destructive">{reclassifyError}</p>
        )}
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            className="gap-1 text-xs"
            onClick={handleDownloadReport}
            disabled={downloading || batch.status !== "DONE"}
          >
            <Download
              className={`h-3.5 w-3.5 ${downloading ? "animate-bounce" : ""}`}
            />
            {downloading ? "生成中..." : "报告"}
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="gap-1 text-xs"
            onClick={handleReclassify}
            disabled={reclassifying}
          >
            <RefreshCw
              className={`h-3.5 w-3.5 ${reclassifying ? "animate-spin" : ""}`}
            />
            {reclassifying ? "分类中..." : "重新分类"}
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="flex-1 gap-1 text-xs"
            onClick={handleExpand}
            disabled={loadingTx}
          >
            {expanded ? (
              <ChevronUp className="h-3.5 w-3.5" />
            ) : (
              <ChevronDown className="h-3.5 w-3.5" />
            )}
            {loadingTx ? "加载中..." : expanded ? "收起" : "展开"}
          </Button>
          <Button
            variant={confirmed ? "destructive" : "outline"}
            size="sm"
            className="gap-1 text-xs"
            disabled={deleting}
            onClick={handleDelete}
          >
            <Trash2 className="h-3.5 w-3.5" />
            {confirmed ? "确认" : "删除"}
          </Button>
        </div>

        {expanded && (
          <div className="mt-3">
            {/* tabs */}
            <div className="mb-3 flex rounded-lg border overflow-hidden text-xs">
              <button
                onClick={() => setTab("list")}
                className={`flex-1 py-1.5 ${tab === "list" ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}
              >
                明细
              </button>
              <button
                onClick={() => setTab("uncategorized")}
                className={`flex-1 py-1.5 ${tab === "uncategorized" ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}
              >
                未分类 ({uncategorized.length})
              </button>
              <button
                onClick={() => setTab("top")}
                className={`flex-1 py-1.5 ${tab === "top" ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}
              >
                大额
              </button>
              <button
                onClick={handleTabStats}
                className={`flex-1 py-1.5 ${tab === "stats" ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}
              >
                统计
              </button>
            </div>

            {tab === "list" && (
              <TransactionList
                transactions={transactions}
                categories={categories}
              />
            )}

            {tab === "uncategorized" &&
              (uncategorized.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  所有交易都已分类
                </p>
              ) : (
                <div className="space-y-2">
                  {merchantGroups.map((g) => (
                    <div
                      key={g.merchant}
                      className="rounded-lg border overflow-hidden"
                    >
                      <button
                        onClick={() =>
                          setExpandedMerchant(
                            expandedMerchant === g.merchant ? null : g.merchant,
                          )
                        }
                        className="flex w-full items-center justify-between px-3 py-2 text-left"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium truncate">
                            {g.merchant}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {g.count} 笔 · ¥{g.totalAmount.toFixed(2)} ·{" "}
                            {g.lastDate}
                          </p>
                        </div>
                      </button>
                      {expandedMerchant === g.merchant && (
                        <div className="border-t px-3 py-2 flex items-center gap-2">
                          <select
                            defaultValue=""
                            onChange={(e) => {
                              if (e.target.value)
                                assignCategory(
                                  g.merchant,
                                  g.ids,
                                  e.target.value,
                                );
                            }}
                            disabled={assigningMerchant === g.merchant}
                            className="flex-1 rounded border bg-background px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-ring"
                          >
                            <option value="">选择分类...</option>
                            {categories.map((c) => (
                              <option key={c.id} value={c.id}>
                                {c.icon} {c.name}
                              </option>
                            ))}
                          </select>
                          {assigningMerchant === g.merchant && (
                            <span className="text-xs text-muted-foreground">
                              应用中...
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ))}

            {tab === "top" &&
              (() => {
                const top10 = [...transactions]
                  .filter((t) => t.type === "DEBIT")
                  .sort((a, b) => {
                    const amtA =
                      typeof a.amount === "string"
                        ? parseFloat(a.amount)
                        : a.amount;
                    const amtB =
                      typeof b.amount === "string"
                        ? parseFloat(b.amount)
                        : b.amount;
                    return amtB - amtA;
                  })
                  .slice(0, 10);
                return top10.length === 0 ? (
                  <p className="py-8 text-center text-sm text-muted-foreground">
                    暂无数据
                  </p>
                ) : (
                  <div className="space-y-2">
                    {top10.map((t, i) => {
                      const amt =
                        typeof t.amount === "string"
                          ? parseFloat(t.amount)
                          : t.amount;
                      const cat = categories.find((c) => c.id === t.categoryId);
                      return (
                        <div
                          key={t.id}
                          className="flex items-center gap-3 rounded-lg border px-3 py-2"
                        >
                          <span className="text-lg font-bold text-muted-foreground w-6 text-center">
                            {i + 1}
                          </span>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium truncate">
                              {t.merchant}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {t.txDate?.slice(0, 10)}
                            </p>
                            <div className="mt-1 flex gap-1.5">
                              <select
                                value={t.categoryId ?? ""}
                                onChange={(e) => {
                                  const val = e.target.value || null;
                                  fetch(`/api/transactions/${t.id}`, {
                                    method: "PATCH",
                                    headers: {
                                      "Content-Type": "application/json",
                                    },
                                    body: JSON.stringify({ categoryId: val }),
                                  });
                                  setTransactions((prev) =>
                                    prev.map((tx) =>
                                      tx.id === t.id
                                        ? { ...tx, categoryId: val }
                                        : tx,
                                    ),
                                  );
                                }}
                                className="w-24 shrink-0 rounded border bg-background px-1.5 py-0.5 text-xs focus:outline-none focus:ring-1 focus:ring-ring"
                              >
                                <option value="">未分类</option>
                                {categories.map((c) => (
                                  <option key={c.id} value={c.id}>
                                    {c.icon} {c.name}
                                  </option>
                                ))}
                              </select>
                              <input
                                defaultValue={t.note ?? ""}
                                placeholder="备注..."
                                onBlur={(e) => {
                                  const val = e.target.value.trim();
                                  if (val !== (t.note ?? "")) {
                                    fetch(`/api/transactions/${t.id}`, {
                                      method: "PATCH",
                                      headers: {
                                        "Content-Type": "application/json",
                                      },
                                      body: JSON.stringify({
                                        note: val || null,
                                      }),
                                    });
                                    setTransactions((prev) =>
                                      prev.map((tx) =>
                                        tx.id === t.id
                                          ? { ...tx, note: val || null }
                                          : tx,
                                      ),
                                    );
                                  }
                                }}
                                className="flex-1 min-w-0 rounded border bg-background px-1.5 py-0.5 text-xs focus:outline-none focus:ring-1 focus:ring-ring"
                              />
                            </div>
                          </div>
                          <span className="text-sm font-semibold text-red-500 shrink-0">
                            ¥{amt.toFixed(2)}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                );
              })()}

            {tab === "stats" &&
              (loadingStats ? (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  加载中...
                </p>
              ) : stats ? (
                <div className="space-y-3">
                  <SpendingPieChart byCategory={stats.byCategory} />
                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-lg border p-3">
                      <p className="text-xs text-muted-foreground">本期支出</p>
                      <p className="text-lg font-semibold text-red-500">
                        ¥{stats.totalDebit.toFixed(2)}
                      </p>
                    </div>
                    <div className="rounded-lg border p-3">
                      <p className="text-xs text-muted-foreground">本期收入</p>
                      <p className="text-lg font-semibold text-green-600">
                        ¥{stats.totalCredit.toFixed(2)}
                      </p>
                    </div>
                  </div>
                </div>
              ) : null)}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
