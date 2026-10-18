"use client";

import { useMemo, useState } from "react";
import { App, Input, InputNumber, Select, Table, Typography } from "antd";
import type { ColumnsType, TablePaginationConfig } from "antd/es/table";
import type { ApiTransaction, ApiCategory } from "@/lib/api-types";

interface Props {
  transactions: ApiTransaction[]
  categories: ApiCategory[]
}

const UNCATEGORIZED = "未分类";

function CategorySelect({
  value,
  categories,
  onChange,
}: {
  value: string | null;
  categories: ApiCategory[];
  onChange: (value: string | null) => void;
}) {
  return (
    <Select
      size="small"
      style={{ width: 140 }}
      showSearch
      value={value ?? ""}
      optionFilterProp="label"
      options={[
        { value: "", label: UNCATEGORIZED },
        ...categories.map((c) => ({
          value: c.id,
          label: `${c.icon ?? ""} ${c.name}`.trim(),
        })),
      ]}
      onChange={(v) => onChange(v || null)}
    />
  );
}

function InlineText({
  defaultValue,
  width,
  onCommit,
}: {
  defaultValue: string;
  width: number;
  onCommit: (value: string) => void;
}) {
  return (
    <Input
      size="small"
      defaultValue={defaultValue}
      style={{ width }}
      onBlur={(e) => onCommit(e.target.value)}
    />
  );
}

export function AdminTransactionTable({ transactions: initial, categories }: Props) {
  const { message } = App.useApp();
  const [rows, setRows] = useState(initial);
  const [pagination, setPagination] = useState<TablePaginationConfig>({
    current: 1,
    pageSize: 20,
  });

  async function patch(id: string, field: string, value: unknown) {
    try {
      const res = await fetch(`/api/transactions/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [field]: value }),
      });
      if (!res.ok) {
        message.error("保存失败，请重试");
        return;
      }
      setRows((prev) => prev.map((r) => (r.id === id ? { ...r, [field]: value } : r)));
    } catch {
      message.error("网络错误，保存失败");
    }
  }

  const columns: ColumnsType<ApiTransaction> = useMemo(
    () => [
      {
        title: "日期",
        dataIndex: "txDate",
        width: 130,
        render: (_, t) => (
          <InlineText
            defaultValue={t.txDate.slice(0, 10)}
            width={110}
            onCommit={(v) => void patch(t.id, "txDate", v)}
          />
        ),
      },
      {
        title: "商户",
        dataIndex: "merchant",
        width: 180,
        render: (_, t) => (
          <InlineText
            defaultValue={t.merchant}
            width={160}
            onCommit={(v) => void patch(t.id, "merchant", v)}
          />
        ),
      },
      {
        title: "金额",
        dataIndex: "amount",
        width: 110,
        render: (_, t) => (
          <InputNumber
            size="small"
            defaultValue={t.amount}
            style={{ width: 90 }}
            onBlur={(e) => {
              const v = parseFloat((e.target as HTMLInputElement).value);
              if (!Number.isNaN(v)) void patch(t.id, "amount", v);
            }}
          />
        ),
      },
      {
        title: "类型",
        dataIndex: "type",
        width: 100,
        render: (_, t) => (
          <Select
            size="small"
            style={{ width: 84 }}
            defaultValue={t.type}
            options={[
              { value: "DEBIT", label: "支出" },
              { value: "CREDIT", label: "收入" },
            ]}
            onChange={(v) => void patch(t.id, "type", v)}
          />
        ),
      },
      {
        title: "分类",
        dataIndex: "categoryId",
        width: 160,
        render: (_, t) => (
          <CategorySelect
            value={t.categoryId}
            categories={categories}
            onChange={(v) => void patch(t.id, "categoryId", v)}
          />
        ),
      },
      {
        title: "用途",
        dataIndex: "purpose",
        width: 140,
        render: (_, t) => (
          <InlineText
            defaultValue={t.purpose ?? ""}
            width={120}
            onCommit={(v) => void patch(t.id, "purpose", v || null)}
          />
        ),
      },
      {
        title: "备注",
        dataIndex: "note",
        width: 140,
        render: (_, t) => (
          <InlineText
            defaultValue={t.note ?? ""}
            width={120}
            onCommit={(v) => void patch(t.id, "note", v || null)}
          />
        ),
      },
      {
        title: "状态",
        dataIndex: "txStatus",
        width: 100,
        render: (_, t) => (
          <InlineText
            defaultValue={t.txStatus ?? ""}
            width={80}
            onCommit={(v) => void patch(t.id, "txStatus", v || null)}
          />
        ),
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [categories, message],
  );

  return (
    <div className="w-full overflow-x-auto">
      <Typography.Text type="secondary" className="mb-2 block text-xs">
        共 {rows.length} 条，单元格失焦或选择后自动保存
      </Typography.Text>
      <Table
        rowKey="id"
        size="small"
        columns={columns}
        dataSource={rows}
        scroll={{ x: true }}
        pagination={{
          ...pagination,
          showSizeChanger: true,
          showTotal: (total) => `共 ${total} 条`,
          onChange: (current, pageSize) =>
            setPagination({ ...pagination, current, pageSize }),
        }}
      />
    </div>
  );
}
