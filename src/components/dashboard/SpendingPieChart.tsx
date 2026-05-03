"use client";

import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
} from "recharts";

interface CategoryData {
  categoryName: string;
  icon: string | null;
  amount: number;
}

interface SpendingPieChartProps {
  byCategory: CategoryData[];
}

const COLORS = [
  "#6366f1",
  "#f59e0b",
  "#10b981",
  "#ef4444",
  "#3b82f6",
  "#ec4899",
  "#8b5cf6",
  "#14b8a6",
  "#f97316",
  "#84cc16",
];

function formatAmount(amount: number) {
  return `¥${amount.toFixed(2)}`;
}

function CustomLabel({
  cx,
  cy,
  midAngle,
  innerRadius,
  outerRadius,
  percent,
}: {
  cx: number;
  cy: number;
  midAngle: number;
  innerRadius: number;
  outerRadius: number;
  percent: number;
}) {
  if (percent < 0.06) return null;
  const RADIAN = Math.PI / 180;
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);
  return (
    <text
      x={x}
      y={y}
      fill="white"
      textAnchor="middle"
      dominantBaseline="central"
      fontSize={12}
    >
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  );
}

function CustomLegend({
  payload,
}: {
  payload?: {
    value: string;
    color: string;
    payload: { amount: number; icon: string };
  }[];
}) {
  if (!payload) return null;
  return (
    <ul className="flex flex-col gap-1 text-xs px-2">
      {payload.map((entry) => (
        <li
          key={entry.value}
          className="flex items-center justify-between gap-2"
        >
          <span className="flex items-center gap-1.5">
            <span
              className="inline-block h-2.5 w-2.5 rounded-full"
              style={{ background: entry.color }}
            />
            <span>
              {entry.payload.icon} {entry.value}
            </span>
          </span>
          <span className="text-muted-foreground">
            {formatAmount(entry.payload.amount)}
          </span>
        </li>
      ))}
    </ul>
  );
}

export function SpendingPieChart({ byCategory }: SpendingPieChartProps) {
  if (byCategory.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">暂无数据</p>
    );
  }

  const data = byCategory.map((c) => ({
    name: c.categoryName,
    amount: c.amount,
    icon: c.icon,
  }));

  return (
    <div>
      <ResponsiveContainer width="100%" height={220}>
        <PieChart>
          <Pie
            data={data}
            dataKey="amount"
            nameKey="name"
            cx="50%"
            cy="50%"
            outerRadius={90}
            labelLine={false}
            label={CustomLabel as React.ComponentProps<typeof Pie>["label"]}
          >
            {data.map((_, index) => (
              <Cell key={index} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip formatter={(v) => formatAmount(Number(v))} />
        </PieChart>
      </ResponsiveContainer>
      <ul className="flex flex-col gap-1 text-xs px-2 mt-2">
        {data.map((entry, index) => (
          <li key={entry.name} className="flex items-center justify-between gap-2">
            <span className="flex items-center gap-1.5">
              <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: COLORS[index % COLORS.length] }} />
              <span>{entry.icon} {entry.name}</span>
            </span>
            <span className="text-muted-foreground">{formatAmount(entry.amount)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
