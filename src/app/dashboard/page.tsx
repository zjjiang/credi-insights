"use client";

import { useState, useEffect, useCallback } from "react";
import { MonthSelector } from "@/components/dashboard/MonthSelector";
import { SpendingPieChart } from "@/components/dashboard/SpendingPieChart";
import { DailyBarChart } from "@/components/dashboard/DailyBarChart";
import type { DashboardData } from "@/lib/api-types";

export default function DashboardPage() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async (y: number, m: number) => {
    setLoading(true);
    const monthStr = `${y}-${String(m).padStart(2, "0")}`;
    const res = await fetch(`/api/dashboard?month=${monthStr}`);
    const json = await res.json();
    if (json.success) setData(json.data);
    setLoading(false);
  }, []);

  useEffect(() => { load(year, month); }, [load, year, month]);

  function handleMonthChange(y: number, m: number) {
    setYear(y);
    setMonth(m);
  }

  return (
    <div className="flex flex-col gap-4 p-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">支出统计</h1>
        <MonthSelector year={year} month={month} onChange={handleMonthChange} />
      </div>

      <div className="rounded-xl bg-primary/5 px-4 py-5 text-center">
        <p className="text-sm text-muted-foreground">月总支出</p>
        <p className="mt-1 text-3xl font-bold text-red-500">
          {loading ? "..." : `¥${(data?.totalDebit ?? 0).toFixed(2)}`}
        </p>
      </div>

      {!loading && data && (
        <>
          <div className="rounded-xl bg-card ring-1 ring-foreground/10">
            <p className="px-4 pt-4 text-sm font-medium">分类占比</p>
            <SpendingPieChart byCategory={data.byCategory.map((c) => ({
              categoryName: c.categoryName,
              icon: c.icon ?? "",
              amount: c.amount,
            }))} />
          </div>

          <div className="rounded-xl bg-card px-4 py-4 ring-1 ring-foreground/10">
            <p className="mb-3 text-sm font-medium">每日收支</p>
            <DailyBarChart byDay={data.byDay} />
          </div>
        </>
      )}

      {!loading && !data && (
        <p className="text-center text-sm text-muted-foreground">暂无数据</p>
      )}
    </div>
  );
}
