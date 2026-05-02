"use client";

import { useState } from "react";
import { TransactionRow } from "./TransactionRow";
import type { ApiTransaction, ApiCategory } from "@/lib/api-types";

interface TransactionListProps {
  transactions: ApiTransaction[];
  categories: ApiCategory[];
}

export function TransactionList({ transactions: initial, categories }: TransactionListProps) {
  const [transactions, setTransactions] = useState(initial);

  const totalDebit = transactions
    .filter((t) => t.type === "DEBIT")
    .reduce((sum, t) => sum + Number(t.amount), 0);

  if (transactions.length === 0) {
    return (
      <div className="py-12 text-center text-sm text-muted-foreground">暂无交易记录</div>
    );
  }

  return (
    <div>
      <div className="mb-3 flex items-center justify-between rounded-lg bg-muted/40 px-3 py-2">
        <span className="text-sm text-muted-foreground">共 {transactions.length} 笔</span>
        <span className="text-sm font-medium">
          支出合计 <span className="text-red-500">¥{totalDebit.toFixed(2)}</span>
        </span>
      </div>
      <div>
        {transactions.map((t) => (
          <TransactionRow
            key={t.id}
            transaction={t}
            categories={categories}
            onDelete={(id) => setTransactions((prev) => prev.filter((tx) => tx.id !== id))}
          />
        ))}
      </div>
    </div>
  );
}
