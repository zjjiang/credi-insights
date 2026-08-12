/** 分组所需的最小交易形状（route 传入完整 Prisma 记录即可满足）。 */
export interface GroupableTx {
  txDate: Date | string;
  // number | string | Prisma.Decimal —— 统一用 Number() 归一
  amount: number | string | { toString(): string };
  type: string;
}

export interface DaySummary<T> {
  date: string;
  debit: number;
  credit: number;
  transactions: T[];
}

/**
 * 按自然日分组交易，日期倒序。只返回有交易的日期。
 */
export function groupTransactionsByDay<T extends GroupableTx>(
  transactions: T[],
): DaySummary<T>[] {
  const byDate = new Map<string, T[]>();

  for (const tx of transactions) {
    const txDateObj =
      typeof tx.txDate === "string" ? new Date(tx.txDate) : tx.txDate;
    const key = txDateObj.toISOString().split("T")[0];
    const list = byDate.get(key);
    if (list) list.push(tx);
    else byDate.set(key, [tx]);
  }

  const days: DaySummary<T>[] = [];
  for (const [date, txs] of byDate) {
    let debit = 0;
    let credit = 0;
    for (const tx of txs) {
      const amt = Number(tx.amount);
      if (tx.type === "DEBIT") debit += amt;
      else credit += amt;
    }
    days.push({ date, debit, credit, transactions: txs });
  }

  return days.sort((a, b) => b.date.localeCompare(a.date));
}
