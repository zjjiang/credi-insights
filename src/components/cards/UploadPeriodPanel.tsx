"use client";

import { useState, useEffect } from "react";
import { TransactionList } from "@/components/transactions/TransactionList";
import type { ApiTransaction, ApiCategory } from "@/lib/api-types";

interface UploadPeriodPanelProps {
  uploadId: string;
  categories: ApiCategory[];
}

type PanelTab = "list" | "uncategorized" | "top";

export function UploadPeriodPanel({
  uploadId,
  categories,
}: UploadPeriodPanelProps) {
  const [tab, setTab] = useState<PanelTab>("list");
  const [transactions, setTransactions] = useState<ApiTransaction[]>([]);
  const [loadingTx, setLoadingTx] = useState(true);
  const [expandedMerchant, setExpandedMerchant] = useState<string | null>(null);
  const [assigningMerchant, setAssigningMerchant] = useState<string | null>(
    null,
  );

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/uploads/${uploadId}/transactions`)
      .then((r) => r.json())
      .then((json) => {
        if (!cancelled && json.success) setTransactions(json.data);
      })
      .finally(() => {
        if (!cancelled) setLoadingTx(false);
      });
    return () => {
      cancelled = true;
    };
    // uploadId 变化时父组件通过 key 重新挂载本组件，无需在此重置本地状态
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  if (loadingTx) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        加载中...
      </p>
    );
  }

  return (
    <div>
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
      </div>

      {tab === "list" && (
        <TransactionList transactions={transactions} categories={categories} />
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
                    <p className="text-xs font-medium truncate">{g.merchant}</p>
                    <p className="text-xs text-muted-foreground">
                      {g.count} 笔 · ¥{g.totalAmount.toFixed(2)} · {g.lastDate}
                    </p>
                  </div>
                </button>
                {expandedMerchant === g.merchant && (
                  <div className="border-t px-3 py-2 flex items-center gap-2">
                    <select
                      defaultValue=""
                      onChange={(e) => {
                        if (e.target.value)
                          assignCategory(g.merchant, g.ids, e.target.value);
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
                typeof a.amount === "string" ? parseFloat(a.amount) : a.amount;
              const amtB =
                typeof b.amount === "string" ? parseFloat(b.amount) : b.amount;
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
                              headers: { "Content-Type": "application/json" },
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
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({ note: val || null }),
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
    </div>
  );
}
