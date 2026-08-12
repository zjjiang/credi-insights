"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Trash2 } from "lucide-react";
import type { ApiCategory } from "@/lib/api-types";

interface DayTx {
  id: string;
  txTime: string | null;
  merchant: string;
  amount: number;
  type: "DEBIT" | "CREDIT";
  source: string;
  categoryId: string | null;
  category: { id: string; name: string; icon: string | null } | null;
}

interface DayEntry {
  date: string;
  debit: number;
  credit: number;
  transactions: DayTx[];
}

const STALE_DAYS = 45;

function isStale(date: string, source: string): boolean {
  if (source !== "daily") return false;
  const days =
    (Date.now() - new Date(date + "T00:00:00").getTime()) / 86_400_000;
  return days > STALE_DAYS;
}

function fmt(n: number): string {
  return n.toLocaleString("zh-CN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function DayCard({
  day,
  categories,
  onChanged,
}: {
  day: DayEntry;
  categories: ApiCategory[];
  onChanged: () => void;
}) {
  return (
    <div className="rounded-lg border bg-card">
      <div className="flex items-center justify-between border-b px-3 py-2">
        <span className="text-sm font-medium">{day.date}</span>
        <span className="text-sm tabular-nums">
          {day.debit > 0 && (
            <span className="text-foreground">-{fmt(day.debit)}</span>
          )}
          {day.credit > 0 && (
            <span className="ml-2 text-emerald-600">+{fmt(day.credit)}</span>
          )}
        </span>
      </div>
      <ul className="divide-y">
        {day.transactions.map((tx) => (
          <TxRow
            key={tx.id}
            tx={tx}
            dayDate={day.date}
            categories={categories}
            onChanged={onChanged}
          />
        ))}
      </ul>
    </div>
  );
}

function TxRow({
  tx,
  dayDate,
  categories,
  onChanged,
}: {
  tx: DayTx;
  dayDate: string;
  categories: ApiCategory[];
  onChanged: () => void;
}) {
  const [busy, setBusy] = useState(false);

  async function patchCategory(categoryId: string) {
    setBusy(true);
    try {
      await fetch(`/api/transactions/${tx.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ categoryId: categoryId || null }),
      });
      onChanged();
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!confirm(`删除「${tx.merchant}」这笔记录？`)) return;
    setBusy(true);
    try {
      await fetch(`/api/transactions/${tx.id}`, { method: "DELETE" });
      onChanged();
    } finally {
      setBusy(false);
    }
  }

  const stale = isStale(dayDate, tx.source);

  return (
    <li className="flex items-center gap-2 px-3 py-2 text-sm">
      <span className="min-w-0 flex-1 truncate">{tx.merchant}</span>
      {stale && (
        <Badge
          variant="outline"
          className="border-red-300 text-[10px] text-red-500"
        >
          陈旧未对账
        </Badge>
      )}
      <select
        className="rounded border bg-background px-1 py-0.5 text-xs"
        value={tx.categoryId ?? ""}
        disabled={busy}
        onChange={(e) => patchCategory(e.target.value)}
      >
        <option value="">未分类</option>
        {categories.map((c) => (
          <option key={c.id} value={c.id}>
            {c.icon ? `${c.icon} ` : ""}
            {c.name}
          </option>
        ))}
      </select>
      <span className="tabular-nums">
        {tx.type === "CREDIT" ? "+" : "-"}
        {fmt(tx.amount)}
      </span>
      <button
        className="text-muted-foreground hover:text-red-500"
        disabled={busy}
        onClick={remove}
        aria-label="删除"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    </li>
  );
}
