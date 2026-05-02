"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Trash2 } from "lucide-react";
import type { ApiTransaction, ApiCategory } from "@/lib/api-types";

interface TransactionRowProps {
  transaction: ApiTransaction;
  categories: ApiCategory[];
  onDelete: (id: string) => void;
}

export function TransactionRow({ transaction, categories, onDelete }: TransactionRowProps) {
  const [merchant, setMerchant] = useState(transaction.merchant);
  const [editing, setEditing] = useState(false);
  const [categoryId, setCategoryId] = useState(transaction.categoryId ?? "");
  const [note, setNote] = useState(transaction.note ?? "");
  const [deleting, setDeleting] = useState(false);

  const dt = new Date(transaction.txDate);
  const dateStr = `${dt.getMonth() + 1}/${dt.getDate()} ${String(dt.getHours()).padStart(2, "0")}:${String(dt.getMinutes()).padStart(2, "0")}`;
  const isDebit = transaction.type === "DEBIT";

  async function patchField(field: string, value: string) {
    await fetch(`/api/transactions/${transaction.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ [field]: value }),
    });
  }

  async function handleMerchantBlur() {
    setEditing(false);
    if (merchant !== transaction.merchant) await patchField("merchant", merchant);
  }

  async function handleCategoryChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const val = e.target.value;
    setCategoryId(val);
    await patchField("categoryId", val);
  }

  async function handleNoteBlur() {
    if (note !== (transaction.note ?? "")) await patchField("note", note);
  }

  async function handleDelete() {
    setDeleting(true);
    await fetch(`/api/transactions/${transaction.id}`, { method: "DELETE" });
    onDelete(transaction.id);
  }

  const category = categories.find((c) => c.id === categoryId);

  return (
    <div className="flex flex-col gap-1.5 border-b py-3 last:border-0">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs text-muted-foreground">{dateStr}</span>
        <span className={`text-sm font-semibold ${isDebit ? "text-red-500" : "text-green-600"}`}>
          {isDebit ? "-" : "+"}¥{Number(transaction.amount).toFixed(2)}
        </span>
      </div>

      <div className="flex items-center gap-2">
        {editing ? (
          <input
            autoFocus
            className="flex-1 rounded border px-2 py-0.5 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
            value={merchant}
            onChange={(e) => setMerchant(e.target.value)}
            onBlur={handleMerchantBlur}
          />
        ) : (
          <button
            className="flex-1 text-left text-sm font-medium hover:text-primary"
            onClick={() => setEditing(true)}
          >
            {merchant}
          </button>
        )}
        {transaction.txStatus && (
          <Badge variant={transaction.txStatus === "已入账" ? "outline" : "secondary"} className="text-xs">
            {transaction.txStatus}
          </Badge>
        )}
      </div>

      <div className="flex items-center gap-2">
        <select
          value={categoryId}
          onChange={handleCategoryChange}
          className="flex-1 rounded border bg-background px-2 py-0.5 text-xs focus:outline-none focus:ring-1 focus:ring-ring"
        >
          <option value="">未分类</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.icon} {c.name}
            </option>
          ))}
        </select>
        {category && (
          <Badge variant="secondary" className="text-xs">
            {category.icon} {category.name}
          </Badge>
        )}
        <button
          onClick={handleDelete}
          disabled={deleting}
          className="text-muted-foreground transition-colors hover:text-destructive"
          aria-label="删除"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>

      <Textarea
        value={note}
        onChange={(e) => setNote(e.target.value)}
        onBlur={handleNoteBlur}
        placeholder="备注..."
        className="h-16 resize-none text-xs"
      />
    </div>
  );
}
