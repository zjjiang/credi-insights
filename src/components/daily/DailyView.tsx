"use client";

import { useState, useEffect, useCallback } from "react";
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
  debit: number;
  credit: number;
  transactions: DayTx[];
}

interface ByDayResponse {
  window: { start: string; end: string; days: number };
  days: DayEntry[];
}

export function DailyView({
  categories,
  cardId,
}: {
  categories: ApiCategory[];
  cardId?: string;
}) {
  const [data, setData] = useState<ByDayResponse | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const url = cardId
      ? `/api/cards/${cardId}/transactions`
      : "/api/transactions/by-day";
    const r = await fetch(url).then((x) => x.json());
    if (r.success) setData(r.data);
    setLoading(false);
  }, [cardId]);

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
        暂无交易数据。配置 IMAP 后同步即可。
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {data.days.map((day) => (
        <DayCard
          key={day.date}
          day={day}
          categories={categories}
          onChanged={load}
        />
      ))}
    </div>
  );
}
