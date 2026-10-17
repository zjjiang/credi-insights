"use client";

import { useState, useEffect } from "react";
import { Collapse, Empty, Input, Segmented, Select, Spin, theme } from "antd";
import { TransactionList } from "@/components/transactions/TransactionList";
import type { ApiTransaction, ApiCategory } from "@/lib/api-types";

interface UploadPeriodPanelProps {
  uploadId: string;
  categories: ApiCategory[];
}

type PanelTab = "list" | "uncategorized" | "top";

interface MerchantGroup {
  merchant: string;
  count: number;
  totalAmount: number;
  lastDate: string;
  ids: string[];
}

const toAmount = (amount: ApiTransaction["amount"]): number =>
  typeof amount === "string" ? parseFloat(amount) : amount;

export function UploadPeriodPanel({
  uploadId,
  categories,
}: UploadPeriodPanelProps) {
  const { token } = theme.useToken();
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
  const merchantGroups: MerchantGroup[] = Array.from(
    uncategorized.reduce((map, t) => {
      const cur = map.get(t.merchant) ?? {
        count: 0,
        totalAmount: 0,
        lastDate: "",
        ids: [] as string[],
      };
      const amt = toAmount(t.amount);
      const date = t.txDate?.slice(0, 10) ?? "";
      map.set(t.merchant, {
        count: cur.count + 1,
        totalAmount: cur.totalAmount + amt,
        lastDate: date > cur.lastDate ? date : cur.lastDate,
        ids: [...cur.ids, t.id],
      });
      return map;
    }, new Map<string, Omit<MerchantGroup, "merchant">>()),
  )
    .map(([merchant, v]) => ({ merchant, ...v }))
    .sort((a, b) => b.totalAmount - a.totalAmount);

  const categoryOptions = categories.map((c) => ({
    value: c.id,
    label: `${c.icon} ${c.name}`,
  }));

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

  function patchTransaction(id: string, body: Record<string, unknown>) {
    fetch(`/api/transactions/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  }

  if (loadingTx) {
    return (
      <div className="py-8 text-center">
        <Spin />
      </div>
    );
  }

  return (
    <div>
      <Segmented
        block
        className="mb-3"
        value={tab}
        onChange={(v) => setTab(v as PanelTab)}
        options={[
          { label: "明细", value: "list" },
          { label: `未分类 (${uncategorized.length})`, value: "uncategorized" },
          { label: "大额", value: "top" },
        ]}
      />

      {tab === "list" && (
        <TransactionList transactions={transactions} categories={categories} />
      )}

      {tab === "uncategorized" &&
        (uncategorized.length === 0 ? (
          <div className="py-8">
            <Empty description="所有交易都已分类" />
          </div>
        ) : (
          <Collapse
            accordion
            className="mb-3"
            activeKey={expandedMerchant ?? undefined}
            onChange={(key) => {
              const next = Array.isArray(key) ? key[0] : key;
              setExpandedMerchant(next ?? null);
            }}
            items={merchantGroups.map((g) => ({
              key: g.merchant,
              label: (
                <div className="min-w-0">
                  <p className="text-xs font-medium truncate">{g.merchant}</p>
                  <p
                    className="text-xs"
                    style={{ color: token.colorTextSecondary }}
                  >
                    {g.count} 笔 · ¥{g.totalAmount.toFixed(2)} · {g.lastDate}
                  </p>
                </div>
              ),
              children: (
                <div className="flex items-center gap-2">
                  <Select
                    placeholder="选择分类..."
                    style={{ flex: 1 }}
                    size="small"
                    options={categoryOptions}
                    disabled={assigningMerchant === g.merchant}
                    loading={assigningMerchant === g.merchant}
                    onChange={(value: string) =>
                      assignCategory(g.merchant, g.ids, value)
                    }
                  />
                  {assigningMerchant === g.merchant && (
                    <span
                      className="text-xs whitespace-nowrap"
                      style={{ color: token.colorTextSecondary }}
                    >
                      应用中...
                    </span>
                  )}
                </div>
              ),
            }))}
          />
        ))}

      {tab === "top" &&
        (() => {
          const top10 = [...transactions]
            .filter((t) => t.type === "DEBIT")
            .sort((a, b) => toAmount(b.amount) - toAmount(a.amount))
            .slice(0, 10);
          return top10.length === 0 ? (
            <div className="py-8">
              <Empty description="暂无数据" />
            </div>
          ) : (
            <div className="space-y-2">
              {top10.map((t, i) => {
                const amt = toAmount(t.amount);
                return (
                  <div
                    key={t.id}
                    className="flex items-center gap-3 px-3 py-2"
                    style={{
                      border: `1px solid ${token.colorBorderSecondary}`,
                      borderRadius: token.borderRadiusLG,
                    }}
                  >
                    <span
                      className="text-lg font-bold w-6 text-center shrink-0"
                      style={{ color: token.colorTextSecondary }}
                    >
                      {i + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium truncate">
                        {t.merchant}
                      </p>
                      <p
                        className="text-xs"
                        style={{ color: token.colorTextSecondary }}
                      >
                        {t.txDate?.slice(0, 10)}
                      </p>
                      <div className="mt-1 flex gap-1.5">
                        <Select
                          value={t.categoryId ?? undefined}
                          placeholder="未分类"
                          allowClear
                          size="small"
                          style={{ width: 96 }}
                          options={categoryOptions}
                          onChange={(value) => {
                            const val = value ?? null;
                            patchTransaction(t.id, { categoryId: val });
                            setTransactions((prev) =>
                              prev.map((tx) =>
                                tx.id === t.id
                                  ? { ...tx, categoryId: val }
                                  : tx,
                              ),
                            );
                          }}
                        />
                        <Input
                          defaultValue={t.note ?? ""}
                          placeholder="备注..."
                          size="small"
                          className="flex-1 min-w-0"
                          onBlur={(e) => {
                            const val = e.target.value.trim();
                            if (val !== (t.note ?? "")) {
                              patchTransaction(t.id, { note: val || null });
                              setTransactions((prev) =>
                                prev.map((tx) =>
                                  tx.id === t.id
                                    ? { ...tx, note: val || null }
                                    : tx,
                                ),
                              );
                            }
                          }}
                        />
                      </div>
                    </div>
                    <span
                      className="text-sm font-semibold shrink-0"
                      style={{ color: token.colorError }}
                    >
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
