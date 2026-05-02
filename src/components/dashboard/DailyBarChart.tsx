"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

interface DayData {
  date: string;
  debit: number;
  credit: number;
}

interface DailyBarChartProps {
  byDay: DayData[];
}

function formatDate(date: string) {
  const d = new Date(date);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

export function DailyBarChart({ byDay }: DailyBarChartProps) {
  if (byDay.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">暂无数据</p>
    );
  }

  const data = byDay.map((d) => ({ ...d, date: formatDate(d.date) }));
  const chartWidth = Math.max(data.length * 40, 300);

  return (
    <div className="overflow-x-auto">
      <div style={{ minWidth: chartWidth }}>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart
            data={data}
            margin={{ top: 4, right: 8, left: 0, bottom: 0 }}
          >
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="date" tick={{ fontSize: 11 }} />
            <YAxis
              tick={{ fontSize: 11 }}
              width={45}
              tickFormatter={(v) => `¥${v}`}
            />
            <Tooltip formatter={(v) => `¥${Number(v).toFixed(2)}`} />
            <Legend formatter={(v) => (v === "debit" ? "支出" : "收入")} />
            <Bar
              dataKey="debit"
              name="debit"
              fill="#ef4444"
              radius={[3, 3, 0, 0]}
            />
            <Bar
              dataKey="credit"
              name="credit"
              fill="#10b981"
              radius={[3, 3, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
