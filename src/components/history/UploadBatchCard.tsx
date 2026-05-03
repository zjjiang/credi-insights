"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronUp, Trash2 } from "lucide-react";
import { TransactionList } from "@/components/transactions/TransactionList";
import { SpendingPieChart } from "@/components/dashboard/SpendingPieChart";
import type { ApiUpload, ApiTransaction, ApiCategory, DashboardData } from "@/lib/api-types";

interface UploadBatchCardProps {
  batch: ApiUpload;
  categories: ApiCategory[];
  onDeleted: (id: string) => void;
}

export function UploadBatchCard({ batch, categories, onDeleted }: UploadBatchCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [tab, setTab] = useState<"list" | "stats">("list");
  const [transactions, setTransactions] = useState<ApiTransaction[]>(batch.transactions ?? []);
  const [loadingTx, setLoadingTx] = useState(false);
  const [stats, setStats] = useState<DashboardData | null>(null);
  const [loadingStats, setLoadingStats] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmed, setConfirmed] = useState(false);

  const periodLabel = batch.billingStart && batch.billingEnd
    ? `${batch.billingStart.slice(0, 10)} ~ ${batch.billingEnd.slice(0, 10)}`
    : batch.imageMonth ?? batch.originalName;

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

  async function handleDelete() {
    if (!confirmed) { setConfirmed(true); return; }
    setDeleting(true);
    await fetch(`/api/uploads/${batch.id}`, { method: "DELETE" });
    onDeleted(batch.id);
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <div className="flex flex-col gap-1">
            <CardTitle className="text-sm">{periodLabel}</CardTitle>
            <div className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
              {batch.cardLast4 && <span>尾号 {batch.cardLast4}</span>}
              {batch.dueDate && <span>· 还款日 {batch.dueDate.slice(0, 10)}</span>}
            </div>
          </div>
          <div className="flex flex-col items-end gap-1">
            <span className={`text-xs font-medium ${
              batch.status === "DONE" ? "text-green-600" :
              batch.status === "FAILED" ? "text-destructive" : "text-muted-foreground"
            }`}>
              {batch.status === "DONE" ? "完成" : batch.status === "FAILED" ? "失败" : "处理中"}
            </span>
            <span className="text-xs text-muted-foreground">{batch.txCount} 笔</span>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="flex-1 gap-1 text-xs" onClick={handleExpand} disabled={loadingTx}>
            {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
            {loadingTx ? "加载中..." : expanded ? "收起" : "展开"}
          </Button>
          <Button variant={confirmed ? "destructive" : "outline"} size="sm" className="gap-1 text-xs" disabled={deleting} onClick={handleDelete}>
            <Trash2 className="h-3.5 w-3.5" />
            {confirmed ? "确认" : "删除"}
          </Button>
        </div>

        {expanded && (
          <div className="mt-3">
            {/* tabs */}
            <div className="mb-3 flex rounded-lg border overflow-hidden text-xs">
              <button onClick={() => setTab("list")}
                className={`flex-1 py-1.5 ${tab === "list" ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}>
                明细
              </button>
              <button onClick={handleTabStats}
                className={`flex-1 py-1.5 ${tab === "stats" ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}>
                统计
              </button>
            </div>

            {tab === "list" && (
              <TransactionList transactions={transactions} categories={categories} />
            )}

            {tab === "stats" && (
              loadingStats ? (
                <p className="py-8 text-center text-sm text-muted-foreground">加载中...</p>
              ) : stats ? (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-lg border p-3">
                      <p className="text-xs text-muted-foreground">本期支出</p>
                      <p className="text-lg font-semibold text-red-500">¥{stats.totalDebit.toFixed(2)}</p>
                    </div>
                    <div className="rounded-lg border p-3">
                      <p className="text-xs text-muted-foreground">本期收入</p>
                      <p className="text-lg font-semibold text-green-600">¥{stats.totalCredit.toFixed(2)}</p>
                    </div>
                  </div>
                  <SpendingPieChart byCategory={stats.byCategory} />
                </div>
              ) : null
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
