"use client";

import { useMemo, useState } from "react";
import { App, Button, Checkbox, Input, Select, Tag, Typography } from "antd";
import type { SelectProps } from "antd";
import { DeleteOutlined } from "@ant-design/icons";
import type { ApiTransaction, ApiCategory } from "@/lib/api-types";

interface TransactionRowProps {
  transaction: ApiTransaction;
  categories: ApiCategory[];
  selected?: boolean;
  onSelect?: () => void;
  onDelete: (id: string) => void;
}

export function TransactionRow({
  transaction,
  categories,
  selected,
  onSelect,
  onDelete,
}: TransactionRowProps) {
  const { message } = App.useApp();
  const [merchant, setMerchant] = useState(transaction.merchant);
  const [editing, setEditing] = useState(false);
  const [categoryId, setCategoryId] = useState<string | undefined>(
    transaction.categoryId ?? undefined,
  );
  const [note, setNote] = useState(transaction.note ?? "");
  const [deleting, setDeleting] = useState(false);

  const categoryOptions: SelectProps["options"] = useMemo(
    () => categories.map((c) => ({ value: c.id, label: `${c.icon} ${c.name}` })),
    [categories],
  );

  const dt = new Date(transaction.txDate);
  const dateStr = `${dt.getMonth() + 1}/${dt.getDate()}`;
  const isDebit = transaction.type === "DEBIT";

  async function patchField(field: string, value: unknown) {
    try {
      const res = await fetch(`/api/transactions/${transaction.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [field]: value }),
      });
      if (!res.ok) throw new Error(`保存失败（HTTP ${res.status}）`);
    } catch (err) {
      message.error(err instanceof Error ? err.message : "保存失败，请稍后重试");
    }
  }

  async function handleMerchantBlur() {
    setEditing(false);
    if (merchant !== transaction.merchant) await patchField("merchant", merchant);
  }

  async function handleCategoryChange(value: unknown) {
    const val = (value ?? undefined) as string | undefined;
    setCategoryId(val);
    await patchField("categoryId", val ?? null);
  }

  async function handleNoteBlur() {
    if (note !== (transaction.note ?? "")) await patchField("note", note);
  }

  async function handleDelete() {
    setDeleting(true);
    try {
      const res = await fetch(`/api/transactions/${transaction.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error(`删除失败（HTTP ${res.status}）`);
      onDelete(transaction.id);
    } catch (err) {
      message.error(err instanceof Error ? err.message : "删除失败，请稍后重试");
    } finally {
      setDeleting(false);
    }
  }

  const category = categories.find((c) => c.id === categoryId);

  return (
    <div
      className={`flex flex-col gap-1.5 border-b border-gray-100 py-3 last:border-0 ${
        selected ? "bg-blue-50/50" : ""
      }`}
    >
      <div className="flex items-center gap-2">
        {onSelect && (
          <Checkbox
            checked={!!selected}
            onChange={onSelect}
            className="shrink-0"
          />
        )}
        <span className="text-xs text-gray-500">{dateStr}</span>
        <span
          className={`ml-auto text-sm font-semibold ${
            isDebit ? "text-red-500" : "text-emerald-600"
          }`}
        >
          {isDebit ? "-" : "+"}¥{Number(transaction.amount).toFixed(2)}
        </span>
      </div>

      <div className="flex items-center gap-2">
        {editing ? (
          <Input
            size="small"
            autoFocus
            className="flex-1"
            value={merchant}
            onChange={(e) => setMerchant(e.target.value)}
            onBlur={handleMerchantBlur}
          />
        ) : (
          <Typography.Text
            strong
            className="flex-1 truncate"
            style={{ cursor: "pointer" }}
            onClick={() => setEditing(true)}
          >
            {merchant}
          </Typography.Text>
        )}
        {transaction.graduatedFromDaily && (
          <Tag title="这笔由日推送带标签进入，月账单对账时保留了原分类" className="mr-0 text-xs">
            日推带标
          </Tag>
        )}
        {transaction.txStatus && (
          <Tag className="mr-0 text-xs">{transaction.txStatus}</Tag>
        )}
      </div>

      <div className="flex items-center gap-2">
        <Select
          size="small"
          className="min-w-0 flex-1"
          placeholder="未分类"
          value={categoryId}
          onChange={handleCategoryChange}
          options={categoryOptions}
          showSearch
          optionFilterProp="label"
          allowClear
        />
        {category && (
          <Tag className="mr-0 text-xs">
            {category.icon} {category.name}
          </Tag>
        )}
        <Button
          type="text"
          size="small"
          danger
          icon={<DeleteOutlined />}
          onClick={handleDelete}
          disabled={deleting}
          aria-label="删除"
        />
      </div>

      <Input.TextArea
        size="small"
        value={note}
        onChange={(e) => setNote(e.target.value)}
        onBlur={handleNoteBlur}
        placeholder="备注..."
        autoSize={{ minRows: 2, maxRows: 4 }}
        className="text-xs"
      />
    </div>
  );
}
