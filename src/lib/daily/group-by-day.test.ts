import { describe, it, expect } from "vitest";
import { groupTransactionsByDay } from "./group-by-day";

interface Tx {
  txDate: string;
  amount: number;
  type: string;
  source: string;
}

const tx = (txDate: string, amount: number, type: string, source: string): Tx => ({
  txDate,
  amount,
  type,
  source,
});

describe("groupTransactionsByDay", () => {
  it("groups transactions by date with correct totals", () => {
    const txs: Tx[] = [
      tx("2026-08-10", 100, "DEBIT", "daily"),
      tx("2026-08-10", 50, "DEBIT", "bill"),
      tx("2026-08-12", 30, "CREDIT", "daily"),
    ];
    const days = groupTransactionsByDay(txs);

    expect(days).toHaveLength(2);
    expect(days.map((d) => d.date)).toEqual(["2026-08-12", "2026-08-10"]);
    expect(days[0].credit).toBe(30);
    expect(days[0].debit).toBe(0);
    expect(days[1].debit).toBe(150);
    expect(days[1].transactions).toHaveLength(2);
  });

  it("only returns dates that have transactions", () => {
    const txs: Tx[] = [
      tx("2026-08-10", 100, "DEBIT", "daily"),
      tx("2026-08-12", 30, "CREDIT", "daily"),
    ];
    const days = groupTransactionsByDay(txs);

    expect(days).toHaveLength(2);
    expect(days.map((d) => d.date)).toEqual(["2026-08-12", "2026-08-10"]);
  });

  it("handles both daily and bill sources on same day", () => {
    const txs: Tx[] = [
      tx("2026-08-10", 100, "DEBIT", "daily"),
      tx("2026-08-10", 50, "DEBIT", "bill"),
    ];
    const days = groupTransactionsByDay(txs);

    expect(days).toHaveLength(1);
    expect(days[0].transactions).toHaveLength(2);
    expect(days[0].transactions.map((t) => t.source).sort()).toEqual(["bill", "daily"]);
  });
});
