"use client";

import { useState, useEffect, useCallback } from "react";
import { AlertTriangle } from "lucide-react";
import type { ApiCategory } from "@/lib/api-types";
import { DayCard } from "./DayCard";

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
  covered: boolean;
  debit: number;
  credit: number;
  transactions: DayTx[];
}

interface ByDayResponse {
  window: { start: string; end: string; days: number };
  hasGap: boolean;
  days: DayEntry[];
}

export function DailyView({ categories }: { categories: ApiCategory[] }) {
  const [data, setData] = useState<ByDayResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refetching, setRefetching] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const r = await fetch("/api/transactions/by-day").then((x) => x.json());
    if (r.success) setData(r.data);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function refetchDay(date: string) {
    setRefetching(date);
    try {
      await fetch("/api/ingest/refetch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ start: date }),
      });
      await load();
    } finally {
      setRefetching(null);
    }
  }

  if (loading) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        加载中...
      </p>
    );
  }
  if (!data || data.days.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        暂无日推送数据。配置 IMAP 后运行抓取即可。
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {data.hasGap && (
        <div className="flex items-center gap-2 rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-700">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span>部分日期未收到日推，含缺口的汇总数字可能偏低。</span>
        </div>
      )}
      {data.days.map((day) => (
        <DayCard
          key={day.date}
          day={day}
          categories={categories}
          refetching={refetching === day.date}
          onRefetch={() => refetchDay(day.date)}
          onChanged={load}
        />
      ))}
    </div>
  );
}
