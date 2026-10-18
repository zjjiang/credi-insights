"use client";

import { useState } from "react";
import { Button, Card, Input, Select, Tabs, Tag, Typography } from "antd";
import {
  DeleteOutlined,
  DownOutlined,
  DownloadOutlined,
  ReloadOutlined,
  UpOutlined,
} from "@ant-design/icons";
import { TransactionList } from "@/components/transactions/TransactionList";
import { SpendingPieChart } from "@/components/dashboard/SpendingPieChart";
import type {
  ApiUpload,
  ApiTransaction,
  ApiCategory,
  DashboardData,
} from "@/lib/api-types";

const AMOUNT_DEBIT_COLOR = "#f5222d";
const AMOUNT_CREDIT_COLOR = "#52c41a";

type BatchTab = "list" | "uncategorized" | "top" | "stats";

interface MerchantGroupEntry {
  count: number;
  totalAmount: number;
  lastDate: string;
  ids: string[];
}

interface MerchantGroup extends MerchantGroupEntry {
  merchant: string;
}

interface UploadBatchCardProps {
  batch: ApiUpload;
  categories: ApiCategory[];
  onDeleted: (id: string) => void;
}

function parseAmount(amount: number | string): number {
  return typeof amount === "string" ? parseFloat(amount) : amount;
}

function buildMerchantGroups(transactions: ApiTransaction[]): MerchantGroup[] {
  const uncategorized = transactions.filter((t) => !t.categoryId);
  return Array.from(
    uncategorized.reduce((map, t) => {
      const cur = map.get(t.merchant) ?? {
        count: 0,
        totalAmount: 0,
        lastDate: "",
        ids: [] as string[],
      };
      const date = t.txDate?.slice(0, 10) ?? "";
      map.set(t.merchant, {
        count: cur.count + 1,
        totalAmount: cur.totalAmount + parseAmount(t.amount),
        lastDate: date > cur.lastDate ? date : cur.lastDate,
        ids: [...cur.ids, t.id],
      });
      return map;
    }, new Map<string, MerchantGroupEntry>()),
  )
    .map(([merchant, v]) => ({ merchant, ...v }))
    .sort((a, b) => b.totalAmount - a.totalAmount);
}

function topDebitTransactions(
  transactions: ApiTransaction[],
): ApiTransaction[] {
  return [...transactions]
    .filter((t) => t.type === "DEBIT")
    .sort((a, b) => parseAmount(b.amount) - parseAmount(a.amount))
    .slice(0, 10);
}

function StatusTag({ status }: { status: string }) {
  if (status === "DONE") return <Tag color="success">完成</Tag>;
  if (status === "FAILED") return <Tag color="error">失败</Tag>;
  return <Tag>处理中</Tag>;
}

function EmptyHint({ text }: { text: string }) {
  return (
    <div className="py-8 text-center">
      <Typography.Text type="secondary">{text}</Typography.Text>
    </div>
  );
}

function categoryOptions(categories: ApiCategory[]) {
  return categories.map((c) => ({ value: c.id, label: `${c.icon} ${c.name}` }));
}

interface MerchantGroupItemProps {
  group: MerchantGroup;
  categories: ApiCategory[];
  expanded: boolean;
  assigning: boolean;
  onToggle: () => void;
  onAssign: (categoryId: string) => void;
}

function MerchantGroupItem({
  group,
  categories,
  expanded,
  assigning,
  onToggle,
  onAssign,
}: MerchantGroupItemProps) {
  return (
    <div className="overflow-hidden rounded-lg border">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between px-3 py-2 text-left"
      >
        <div className="min-w-0 flex-1">
          <Typography.Text strong ellipsis className="block text-xs">
            {group.merchant}
          </Typography.Text>
          <Typography.Text type="secondary" className="text-xs">
            {group.count} 笔 · ¥{group.totalAmount.toFixed(2)} ·{" "}
            {group.lastDate}
          </Typography.Text>
        </div>
      </button>
      {expanded && (
        <div className="flex items-center gap-2 border-t px-3 py-2">
          <Select
            size="small"
            className="min-w-0 flex-1"
            placeholder="选择分类..."
            value={undefined}
            disabled={assigning}
            options={categoryOptions(categories)}
            onChange={(value: string) => onAssign(value)}
          />
          {assigning && (
            <Typography.Text type="secondary" className="text-xs">
              应用中...
            </Typography.Text>
          )}
        </div>
      )}
    </div>
  );
}

interface TopTransactionItemProps {
  tx: ApiTransaction;
  index: number;
  categories: ApiCategory[];
  onCategoryChange: (txId: string, categoryId: string | null) => void;
  onNoteChange: (txId: string, note: string | null) => void;
}

function TopTransactionItem({
  tx,
  index,
  categories,
  onCategoryChange,
  onNoteChange,
}: TopTransactionItemProps) {
  const options = [
    { value: "", label: "未分类" },
    ...categoryOptions(categories),
  ];
  return (
    <div className="flex items-center gap-3 rounded-lg border px-3 py-2">
      <Typography.Text
        type="secondary"
        className="w-6 text-center text-lg font-bold"
      >
        {index + 1}
      </Typography.Text>
      <div className="min-w-0 flex-1">
        <Typography.Text strong ellipsis className="block text-xs">
          {tx.merchant}
        </Typography.Text>
        <Typography.Text type="secondary" className="text-xs">
          {tx.txDate?.slice(0, 10)}
        </Typography.Text>
        <div className="mt-1 flex gap-1.5">
          <Select
            size="small"
            className="w-24 shrink-0"
            value={tx.categoryId ?? ""}
            options={options}
            onChange={(value: string) => onCategoryChange(tx.id, value || null)}
          />
          <Input
            size="small"
            className="min-w-0 flex-1"
            defaultValue={tx.note ?? ""}
            placeholder="备注..."
            onBlur={(e) => {
              const val = e.target.value.trim();
              if (val !== (tx.note ?? "")) onNoteChange(tx.id, val || null);
            }}
          />
        </div>
      </div>
      <span
        className="shrink-0 text-sm font-semibold"
        style={{ color: AMOUNT_DEBIT_COLOR }}
      >
        ¥{parseAmount(tx.amount).toFixed(2)}
      </span>
    </div>
  );
}

function UncategorizedPanel({
  merchantGroups,
  categories,
  expandedMerchant,
  assigningMerchant,
  onToggleMerchant,
  onAssignCategory,
}: {
  merchantGroups: MerchantGroup[];
  categories: ApiCategory[];
  expandedMerchant: string | null;
  assigningMerchant: string | null;
  onToggleMerchant: (merchant: string) => void;
  onAssignCategory: (
    merchant: string,
    ids: string[],
    categoryId: string,
  ) => void;
}) {
  if (merchantGroups.length === 0) {
    return <EmptyHint text="所有交易都已分类" />;
  }
  return (
    <div className="space-y-2">
      {merchantGroups.map((g) => (
        <MerchantGroupItem
          key={g.merchant}
          group={g}
          categories={categories}
          expanded={expandedMerchant === g.merchant}
          assigning={assigningMerchant === g.merchant}
          onToggle={() => onToggleMerchant(g.merchant)}
          onAssign={(categoryId) =>
            onAssignCategory(g.merchant, g.ids, categoryId)
          }
        />
      ))}
    </div>
  );
}

function TopPanel({
  transactions,
  categories,
  onCategoryChange,
  onNoteChange,
}: {
  transactions: ApiTransaction[];
  categories: ApiCategory[];
  onCategoryChange: (txId: string, categoryId: string | null) => void;
  onNoteChange: (txId: string, note: string | null) => void;
}) {
  const top10 = topDebitTransactions(transactions);
  if (top10.length === 0) return <EmptyHint text="暂无数据" />;
  return (
    <div className="space-y-2">
      {top10.map((t, i) => (
        <TopTransactionItem
          key={t.id}
          tx={t}
          index={i}
          categories={categories}
          onCategoryChange={onCategoryChange}
          onNoteChange={onNoteChange}
        />
      ))}
    </div>
  );
}

function StatsPanel({
  stats,
  loading,
}: {
  stats: DashboardData | null;
  loading: boolean;
}) {
  if (loading) return <EmptyHint text="加载中..." />;
  if (!stats) return null;
  return (
    <div className="space-y-3">
      <SpendingPieChart byCategory={stats.byCategory} />
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-lg border p-3">
          <Typography.Text type="secondary" className="text-xs">
            本期支出
          </Typography.Text>
          <p
            className="text-lg font-semibold"
            style={{ color: AMOUNT_DEBIT_COLOR }}
          >
            ¥{stats.totalDebit.toFixed(2)}
          </p>
        </div>
        <div className="rounded-lg border p-3">
          <Typography.Text type="secondary" className="text-xs">
            本期收入
          </Typography.Text>
          <p
            className="text-lg font-semibold"
            style={{ color: AMOUNT_CREDIT_COLOR }}
          >
            ¥{stats.totalCredit.toFixed(2)}
          </p>
        </div>
      </div>
    </div>
  );
}

interface ExpandedSectionProps {
  tab: BatchTab;
  uncategorizedCount: number;
  merchantGroups: MerchantGroup[];
  transactions: ApiTransaction[];
  categories: ApiCategory[];
  expandedMerchant: string | null;
  assigningMerchant: string | null;
  stats: DashboardData | null;
  loadingStats: boolean;
  onTabChange: (key: string) => void;
  onToggleMerchant: (merchant: string) => void;
  onAssignCategory: (
    merchant: string,
    ids: string[],
    categoryId: string,
  ) => void;
  onCategoryChange: (txId: string, categoryId: string | null) => void;
  onNoteChange: (txId: string, note: string | null) => void;
}

function ExpandedSection({
  tab,
  uncategorizedCount,
  merchantGroups,
  transactions,
  categories,
  expandedMerchant,
  assigningMerchant,
  stats,
  loadingStats,
  onTabChange,
  onToggleMerchant,
  onAssignCategory,
  onCategoryChange,
  onNoteChange,
}: ExpandedSectionProps) {
  const items = [
    { key: "list", label: "明细" },
    { key: "uncategorized", label: `未分类 (${uncategorizedCount})` },
    { key: "top", label: "大额" },
    { key: "stats", label: "统计" },
  ];
  return (
    <div className="mt-3">
      <Tabs size="small" activeKey={tab} items={items} onChange={onTabChange} />

      {tab === "list" && (
        <TransactionList transactions={transactions} categories={categories} />
      )}

      {tab === "uncategorized" && (
        <UncategorizedPanel
          merchantGroups={merchantGroups}
          categories={categories}
          expandedMerchant={expandedMerchant}
          assigningMerchant={assigningMerchant}
          onToggleMerchant={onToggleMerchant}
          onAssignCategory={onAssignCategory}
        />
      )}

      {tab === "top" && (
        <TopPanel
          transactions={transactions}
          categories={categories}
          onCategoryChange={onCategoryChange}
          onNoteChange={onNoteChange}
        />
      )}

      {tab === "stats" && <StatsPanel stats={stats} loading={loadingStats} />}
    </div>
  );
}

export function UploadBatchCard({
  batch,
  categories,
  onDeleted,
}: UploadBatchCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [tab, setTab] = useState<BatchTab>("list");
  const [transactions, setTransactions] = useState<ApiTransaction[]>(
    batch.transactions ?? [],
  );
  const [loadingTx, setLoadingTx] = useState(false);
  const [stats, setStats] = useState<DashboardData | null>(null);
  const [loadingStats, setLoadingStats] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [reclassifying, setReclassifying] = useState(false);
  const [reclassifyResult, setReclassifyResult] = useState<number | null>(null);
  const [reclassifyError, setReclassifyError] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);
  const [expandedMerchant, setExpandedMerchant] = useState<string | null>(null);
  const [assigningMerchant, setAssigningMerchant] = useState<string | null>(
    null,
  );

  const merchantGroups = buildMerchantGroups(transactions);
  const uncategorizedCount = transactions.filter((t) => !t.categoryId).length;

  const periodLabel =
    batch.billingStart && batch.billingEnd
      ? `${batch.billingStart.slice(0, 10)} ~ ${batch.billingEnd.slice(0, 10)}`
      : (batch.imageMonth ?? batch.originalName);

  async function handleExpand() {
    if (!expanded && transactions.length === 0) {
      setLoadingTx(true);
      const res = await fetch(`/api/uploads/${batch.id}/transactions`);
      const json = await res.json();
      if (json.success) setTransactions(json.data);
      setLoadingTx(false);
    }
    setExpanded((v) => !v);
  }

  async function handleTabStats() {
    setTab("stats");
    if (!stats) {
      setLoadingStats(true);
      const res = await fetch(`/api/dashboard?uploadId=${batch.id}`);
      const json = await res.json();
      if (json.success) setStats(json.data);
      setLoadingStats(false);
    }
  }

  function handleTabChange(key: string) {
    if (key === "stats") {
      handleTabStats();
    } else {
      setTab(key as BatchTab);
    }
  }

  async function handleReclassify() {
    setReclassifying(true);
    setReclassifyResult(null);
    setReclassifyError(null);
    const res = await fetch(`/api/uploads/${batch.id}/reclassify`, {
      method: "POST",
    });
    const json = await res.json();
    if (json.success) {
      setReclassifyResult(json.data.classified);
      const txRes = await fetch(`/api/uploads/${batch.id}/transactions`);
      const txJson = await txRes.json();
      if (txJson.success) setTransactions(txJson.data);
    } else {
      setReclassifyError(json.error ?? "分类失败");
    }
    setReclassifying(false);
  }

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

  async function handleDelete() {
    if (!confirmed) {
      setConfirmed(true);
      return;
    }
    setDeleting(true);
    await fetch(`/api/uploads/${batch.id}`, { method: "DELETE" });
    onDeleted(batch.id);
  }

  async function handleDownloadReport() {
    setDownloading(true);
    try {
      const res = await fetch(`/api/uploads/${batch.id}/report`, {
        cache: "no-store",
      });
      if (!res.ok) throw new Error("下载失败");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `消费报告_${batch.billingStart?.slice(0, 10) ?? batch.imageMonth ?? "report"}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      // silent
    }
    setDownloading(false);
  }

  function changeTopCategory(txId: string, categoryId: string | null) {
    fetch(`/api/transactions/${txId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ categoryId }),
    });
    setTransactions((prev) =>
      prev.map((tx) => (tx.id === txId ? { ...tx, categoryId } : tx)),
    );
  }

  function changeTopNote(txId: string, note: string | null) {
    fetch(`/api/transactions/${txId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ note }),
    });
    setTransactions((prev) =>
      prev.map((tx) => (tx.id === txId ? { ...tx, note } : tx)),
    );
  }

  return (
    <Card
      size="small"
      title={
        <div className="flex flex-col gap-1">
          <span className="text-sm font-medium">{periodLabel}</span>
          <div className="flex flex-wrap items-center gap-1.5 text-xs">
            {batch.cardLast4 && (
              <Typography.Text type="secondary" className="text-xs">
                尾号 {batch.cardLast4}
              </Typography.Text>
            )}
            {batch.dueDate && (
              <Typography.Text type="secondary" className="text-xs">
                · 还款日 {batch.dueDate.slice(0, 10)}
              </Typography.Text>
            )}
          </div>
        </div>
      }
      extra={
        <div className="flex flex-col items-end gap-1">
          <StatusTag status={batch.status} />
          <Typography.Text type="secondary" className="text-xs">
            {batch.txCount} 笔
          </Typography.Text>
        </div>
      }
    >
      {reclassifyResult !== null && (
        <Typography.Text type="success" className="mb-2 block text-xs">
          已分类 {reclassifyResult} 笔
        </Typography.Text>
      )}
      {reclassifyError && (
        <Typography.Text type="danger" className="mb-2 block text-xs">
          {reclassifyError}
        </Typography.Text>
      )}

      <div className="flex gap-2">
        <Button
          size="small"
          icon={<DownloadOutlined />}
          onClick={handleDownloadReport}
          disabled={downloading || batch.status !== "DONE"}
        >
          {downloading ? "生成中..." : "报告"}
        </Button>
        <Button
          size="small"
          icon={<ReloadOutlined spin={reclassifying} />}
          onClick={handleReclassify}
          disabled={reclassifying}
        >
          {reclassifying ? "分类中..." : "重新分类"}
        </Button>
        <Button
          size="small"
          className="flex-1"
          icon={expanded ? <UpOutlined /> : <DownOutlined />}
          onClick={handleExpand}
          disabled={loadingTx}
        >
          {loadingTx ? "加载中..." : expanded ? "收起" : "展开"}
        </Button>
        <Button
          size="small"
          danger={confirmed}
          icon={<DeleteOutlined />}
          disabled={deleting}
          onClick={handleDelete}
        >
          {confirmed ? "确认" : "删除"}
        </Button>
      </div>

      {expanded && (
        <ExpandedSection
          tab={tab}
          uncategorizedCount={uncategorizedCount}
          merchantGroups={merchantGroups}
          transactions={transactions}
          categories={categories}
          expandedMerchant={expandedMerchant}
          assigningMerchant={assigningMerchant}
          stats={stats}
          loadingStats={loadingStats}
          onTabChange={handleTabChange}
          onToggleMerchant={(merchant) =>
            setExpandedMerchant(expandedMerchant === merchant ? null : merchant)
          }
          onAssignCategory={assignCategory}
          onCategoryChange={changeTopCategory}
          onNoteChange={changeTopNote}
        />
      )}
    </Card>
  );
}
