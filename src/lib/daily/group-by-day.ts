import {
  computeWindowCoverage,
  normalizeCoverageDate,
} from "@/lib/imap/coverage";

/** 分组所需的最小交易形状（route 传入完整 Prisma 记录即可满足）。 */
export interface GroupableTx {
  txDate: Date | string;
  // number | string | Prisma.Decimal —— 统一用 Number() 归一
  amount: number | string | { toString(): string };
  type: string;
}

export interface DaySummary<T> {
  date: string;
  covered: boolean;
  debit: number;
  credit: number;
  transactions: T[];
}

/**
 * 按自然日分组交易并附带覆盖状态，日期倒序。
 *
 * 关键不变量：分组维度是交易的发生日（txDate），与 source 无关 ——
 * 交易被月账单对账后仍留在其发生日，不会从「按日」视图消失。
 * 空缺日仍作为空单元返回（covered 由覆盖记录决定），以便展示缺口。
 */
export function groupTransactionsByDay<T extends GroupableTx>(
  transactions: T[],
  coveredDates: string[],
  startDate: string,
  endDate: string,
): DaySummary<T>[] {
  const coverage = computeWindowCoverage(coveredDates, startDate, endDate);

  const byDate = new Map<string, T[]>();
  for (const tx of transactions) {
    const key = normalizeCoverageDate(tx.txDate);
    const list = byDate.get(key);
    if (list) list.push(tx);
    else byDate.set(key, [tx]);
  }

  return coverage.map((day) => {
    const txs = byDate.get(day.date) ?? [];
    let debit = 0;
    let credit = 0;
    for (const tx of txs) {
      const amt = Number(tx.amount);
      if (tx.type === "DEBIT") debit += amt;
      else credit += amt;
    }
    return {
      date: day.date,
      covered: day.covered,
      debit,
      credit,
      transactions: txs,
    };
  });
}
