"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronUp, Trash2 } from "lucide-react";
import { ProcessingStatus } from "@/components/upload/ProcessingStatus";
import { TransactionList } from "@/components/transactions/TransactionList";
import type { ApiUpload, ApiTransaction, ApiCategory } from "@/lib/api-types";

interface UploadBatchCardProps {
  batch: ApiUpload;
  categories: ApiCategory[];
  onDeleted: (id: string) => void;
}

export function UploadBatchCard({ batch, categories, onDeleted }: UploadBatchCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [transactions, setTransactions] = useState<ApiTransaction[]>(batch.transactions ?? []);
  const [loadingTx, setLoadingTx] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmed, setConfirmed] = useState(false);

  const uploadDate = new Date(batch.createdAt).toLocaleDateString("zh-CN", {
    year: "numeric", month: "2-digit", day: "2-digit",
  });

  const monthLabel = batch.imageMonth
    ? new Date(batch.imageMonth + "-01").toLocaleDateString("zh-CN", { year: "numeric", month: "long" })
    : null;

  async function handleExpand() {
    if (!expanded && transactions.length === 0) {
      setLoadingTx(true);
      const res = await fetch(`/api/uploads/${batch.id}/transactions`);
      const json = await res.json();
      if (json.success) setTransactions(json.data);
      setLoadingTx(false);
    }
    setExpanded((v) => !v);
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
            <CardTitle className="text-sm">{batch.originalName}</CardTitle>
            <div className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
              <span>{uploadDate}</span>
              {monthLabel && <span>· {monthLabel}</span>}
              {batch.cardLast4 && <span>· 卡号 {batch.cardLast4}</span>}
            </div>
          </div>
          <div className="flex flex-col items-end gap-2">
            <ProcessingStatus status={batch.status.toLowerCase() as "pending" | "processing" | "done" | "failed"} />
            <span className="text-xs text-muted-foreground">{batch.txCount} 笔交易</span>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            className="flex-1 gap-1 text-xs"
            onClick={handleExpand}
            disabled={loadingTx}
          >
            {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
            {loadingTx ? "加载中..." : expanded ? "收起" : "展开交易"}
          </Button>
          <Button
            variant={confirmed ? "destructive" : "outline"}
            size="sm"
            className="gap-1 text-xs"
            disabled={deleting}
            onClick={handleDelete}
          >
            <Trash2 className="h-3.5 w-3.5" />
            {confirmed ? "确认删除" : "删除"}
          </Button>
        </div>

        {expanded && (
          <div className="mt-3">
            <TransactionList transactions={transactions} categories={categories} />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
