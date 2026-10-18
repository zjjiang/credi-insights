"use client";

import { useMemo, useState } from "react";
import { App, Button, Checkbox, Empty, Input, Select } from "antd";
import type { SelectProps } from "antd";
import { DeleteOutlined } from "@ant-design/icons";
import type { ApiTransaction, ApiCategory } from "@/lib/api-types";

interface TransactionListProps {
  transactions: ApiTransaction[];
  categories: ApiCategory[];
  selectable?: boolean;
}

export function TransactionList({
  transactions: initial,
  categories,
  selectable = true,
}: TransactionListProps) {
  const { message } = App.useApp();
  const [transactions, setTransactions] = useState(initial);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkCategoryId, setBulkCategoryId] = useState<string | undefined>(
    undefined,
  );
  const [applying, setApplying] = useState(false);

  const categoryOptions: SelectProps["options"] = useMemo(
    () =>
      categories.map((c) => ({ value: c.id, label: `${c.icon} ${c.name}` })),
    [categories],
  );

  const totalDebit = transactions
    .filter((t) => t.type === "DEBIT")
    .reduce((s, t) => s + Number(t.amount), 0);
  const allSelected = selected.size === transactions.length;

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  }
  function toggleAll() {
    setSelected((prev) =>
      prev.size === transactions.length
        ? new Set()
        : new Set(transactions.map((t) => t.id)),
    );
  }

  async function applyBulk() {
    if (!bulkCategoryId || selected.size === 0) return;
    setApplying(true);
    try {
      const res = await fetch("/api/transactions/bulk", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ids: [...selected],
          categoryId: bulkCategoryId,
        }),
      });
      if (!res.ok) throw new Error(`批量分类失败（HTTP ${res.status}）`);
      const cat = categories.find((c) => c.id === bulkCategoryId) ?? null;
      setTransactions((prev) =>
        prev.map((t) =>
          selected.has(t.id)
            ? { ...t, categoryId: bulkCategoryId, category: cat }
            : t,
        ),
      );
      setSelected(new Set());
      setBulkCategoryId(undefined);
      message.success("批量分类已应用");
    } catch (err) {
      message.error(
        err instanceof Error ? err.message : "批量分类失败，请稍后重试",
      );
    } finally {
      setApplying(false);
    }
  }

  async function patch(id: string, field: string, value: unknown) {
    try {
      const res = await fetch(`/api/transactions/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [field]: value }),
      });
      if (!res.ok) throw new Error(`保存失败（HTTP ${res.status}）`);
    } catch (err) {
      message.error(
        err instanceof Error ? err.message : "保存失败，请稍后重试",
      );
    }
  }

  if (transactions.length === 0) {
    return (
      <div className="py-12">
        <Empty description="暂无交易记录" />
      </div>
    );
  }

  return (
    <div>
      {/* 汇总栏 */}
      <div className="mb-2 flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2">
        {selectable ? (
          <Checkbox
            checked={allSelected}
            onChange={toggleAll}
            className="text-gray-500"
          >
            共 {transactions.length} 笔
          </Checkbox>
        ) : (
          <span className="text-sm text-gray-500">
            共 {transactions.length} 笔
          </span>
        )}
        <span className="text-sm font-medium">
          支出合计{" "}
          <span className="text-red-500">¥{totalDebit.toFixed(2)}</span>
        </span>
      </div>

      {/* 批量操作栏 */}
      {selectable && selected.size > 0 && (
        <div className="mb-2 flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2">
          <span className="shrink-0 text-sm text-gray-500">
            已选 {selected.size} 笔
          </span>
          <Select
            size="small"
            className="min-w-0 flex-1"
            placeholder="选择分类..."
            value={bulkCategoryId}
            onChange={(value) => setBulkCategoryId(value)}
            options={categoryOptions}
            showSearch
            optionFilterProp="label"
            allowClear
          />
          <Button
            size="small"
            type="primary"
            onClick={applyBulk}
            disabled={!bulkCategoryId || applying}
            loading={applying}
          >
            应用
          </Button>
          <Button
            size="small"
            type="text"
            onClick={() => setSelected(new Set())}
          >
            取消
          </Button>
        </div>
      )}

      {/* 列表 */}
      <div className="overflow-x-auto rounded-lg border border-gray-200">
        <table className="w-full text-xs">
          <thead className="bg-gray-50">
            <tr>
              {selectable && (
                <th className="w-8 px-2 py-2">
                  <Checkbox checked={allSelected} onChange={toggleAll} />
                </th>
              )}
              <th className="px-3 py-2 text-left font-medium text-gray-500">
                日期
              </th>
              <th className="px-3 py-2 text-left font-medium text-gray-500">
                商户
              </th>
              <th className="px-3 py-2 text-right font-medium text-gray-500">
                金额
              </th>
              <th className="px-3 py-2 text-left font-medium text-gray-500">
                分类
              </th>
              <th className="px-3 py-2 text-left font-medium text-gray-500">
                备注
              </th>
              <th className="w-8 px-2 py-2"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {transactions.map((t) => (
              <TransactionListRow
                key={t.id}
                transaction={t}
                categories={categories}
                categoryOptions={categoryOptions}
                selected={selected.has(t.id)}
                onSelect={selectable ? () => toggleSelect(t.id) : undefined}
                onDelete={(id) =>
                  setTransactions((prev) => prev.filter((tx) => tx.id !== id))
                }
                onPatch={patch}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

interface RowProps {
  transaction: ApiTransaction;
  categories: ApiCategory[];
  categoryOptions: NonNullable<SelectProps["options"]>;
  selected: boolean;
  onSelect?: () => void;
  onDelete: (id: string) => void;
  onPatch: (id: string, field: string, value: unknown) => Promise<void>;
}

function TransactionListRow({
  transaction: t,
  categoryOptions,
  selected,
  onSelect,
  onDelete,
  onPatch,
}: RowProps) {
  const [merchant, setMerchant] = useState(t.merchant);
  const [note, setNote] = useState(t.note ?? "");
  const [categoryId, setCategoryId] = useState<string | undefined>(
    t.categoryId ?? undefined,
  );
  const isDebit = t.type === "DEBIT";
  const date = new Date(t.txDate);
  const dateStr = `${date.getMonth() + 1}/${date.getDate()}`;

  return (
    <tr
      className={`transition-colors hover:bg-gray-50 ${selected ? "bg-blue-50/50" : ""}`}
    >
      {onSelect && (
        <td className="px-2 py-1.5 text-center">
          <Checkbox checked={selected} onChange={onSelect} />
        </td>
      )}
      <td className="whitespace-nowrap px-3 py-1.5 text-gray-500">{dateStr}</td>
      <td className="px-3 py-1.5">
        <Input
          size="small"
          variant="borderless"
          value={merchant}
          onChange={(e) => setMerchant(e.target.value)}
          onBlur={() => {
            if (merchant !== t.merchant)
              void onPatch(t.id, "merchant", merchant);
          }}
          className="min-w-[120px]"
        />
      </td>
      <td
        className={`whitespace-nowrap px-3 py-1.5 text-right font-medium ${isDebit ? "text-red-500" : "text-emerald-600"}`}
      >
        {isDebit ? "-" : "+"}¥{Number(t.amount).toFixed(2)}
      </td>
      <td className="px-3 py-1.5">
        <Select
          size="small"
          className="w-full min-w-[80px]"
          placeholder="未分类"
          value={categoryId}
          onChange={(value) => {
            const val = value ?? undefined;
            setCategoryId(val);
            void onPatch(t.id, "categoryId", val ?? null);
          }}
          options={categoryOptions}
          showSearch
          optionFilterProp="label"
          allowClear
        />
      </td>
      <td className="px-3 py-1.5">
        <Input
          size="small"
          variant="borderless"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          onBlur={() => {
            if (note !== (t.note ?? ""))
              void onPatch(t.id, "note", note || null);
          }}
          placeholder="备注..."
          className="min-w-[80px]"
        />
      </td>
      <td className="px-2 py-1.5 text-center">
        <Button
          type="text"
          size="small"
          danger
          icon={<DeleteOutlined />}
          onClick={() => onDelete(t.id)}
          aria-label="删除"
        />
      </td>
    </tr>
  );
}
