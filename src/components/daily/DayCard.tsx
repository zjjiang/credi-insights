"use client";

import { useState } from "react";
import { App, Button, Select, Tag } from "antd";
import { DeleteOutlined } from "@ant-design/icons";
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
  const { modal, message } = App.useApp();

  async function patchCategory(categoryId: string) {
    setBusy(true);
    try {
      const res = await fetch(`/api/transactions/${tx.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ categoryId: categoryId || null }),
      });
      if (!res.ok) {
        message.error("分类更新失败，请重试");
        return;
      }
      onChanged();
    } catch {
      message.error("网络异常，分类更新失败");
    } finally {
      setBusy(false);
    }
  }

  function remove() {
    modal.confirm({
      title: "删除交易记录",
      content: `删除「${tx.merchant}」这笔记录？`,
      okText: "删除",
      okButtonProps: { danger: true },
      cancelText: "取消",
      onOk: async () => {
        setBusy(true);
        try {
          const res = await fetch(`/api/transactions/${tx.id}`, {
            method: "DELETE",
          });
          if (!res.ok) {
            message.error("删除失败，请重试");
            return;
          }
          message.success("已删除");
          onChanged();
        } catch {
          message.error("网络异常，删除失败");
        } finally {
          setBusy(false);
        }
      },
    });
  }

  const stale = isStale(dayDate, tx.source);

  const categoryOptions = [
    { value: "", label: "未分类" },
    ...categories.map((c) => ({
      value: c.id,
      label: `${c.icon ? `${c.icon} ` : ""}${c.name}`,
    })),
  ];

  return (
    <li className="flex items-center gap-2 px-3 py-2 text-sm">
      <span className="min-w-0 flex-1 truncate">{tx.merchant}</span>
      {stale && (
        <Tag color="error" className="shrink-0">
          陈旧未对账
        </Tag>
      )}
      <Select
        size="small"
        className="shrink-0"
        style={{ width: 112 }}
        value={tx.categoryId ?? ""}
        options={categoryOptions}
        disabled={busy}
        onChange={(value) => void patchCategory(value)}
      />
      <span
        className={`shrink-0 tabular-nums font-medium ${
          tx.type === "CREDIT" ? "text-emerald-600" : "text-foreground"
        }`}
      >
        {tx.type === "CREDIT" ? "+" : "-"}
        {fmt(tx.amount)}
      </span>
      <Button
        type="text"
        danger
        size="small"
        icon={<DeleteOutlined />}
        disabled={busy}
        onClick={remove}
        aria-label="删除"
      />
    </li>
  );
}
