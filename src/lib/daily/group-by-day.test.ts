import { describe, it, expect } from "vitest";
import { groupTransactionsByDay } from "./group-by-day";
import { addCoveredDate, computeWindowCoverage } from "@/lib/imap/coverage";

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
  it("8.2 对账后的交易仍留在其发生日，不因 source 消失", () => {
    const txs: Tx[] = [
      tx("2026-08-10", 100, "DEBIT", "daily"),
      // 同一天、已被月账单对账（source=bill）的交易
      tx("2026-08-10", 50, "DEBIT", "bill"),
    ];
    const days = groupTransactionsByDay(txs, ["2026-08-10"], "2026-08-10", "2026-08-10");

    expect(days).toHaveLength(1);
    expect(days[0].transactions).toHaveLength(2);
    expect(days[0].debit).toBe(150);
    // 两种 source 都在
    expect(days[0].transactions.map((t) => t.source).sort()).toEqual(["bill", "daily"]);
  });

  it("倒序返回、区分借贷、空缺日为空单元", () => {
    const txs: Tx[] = [
      tx("2026-08-10", 100, "DEBIT", "daily"),
      tx("2026-08-12", 30, "CREDIT", "daily"),
    ];
    const days = groupTransactionsByDay(txs, ["2026-08-10", "2026-08-12"], "2026-08-10", "2026-08-12");

    expect(days.map((d) => d.date)).toEqual(["2026-08-12", "2026-08-11", "2026-08-10"]);
    expect(days[0].credit).toBe(30);
    expect(days[1].transactions).toHaveLength(0); // 8-11 无交易
    expect(days[2].debit).toBe(100);
  });

  it("8.3 缺口检测 → 标记覆盖 → 缺口消失", () => {
    const window = { start: "2026-08-09", end: "2026-08-11" };
    // 初始只覆盖首尾，中间 8-10 缺口
    let covered = ["2026-08-09", "2026-08-11"];

    const before = computeWindowCoverage(covered, window.start, window.end);
    expect(before.find((d) => d.date === "2026-08-10")?.covered).toBe(false);
    expect(before.some((d) => !d.covered)).toBe(true); // hasGap

    // 补拉后标记 8-10 覆盖
    covered = addCoveredDate(covered, "2026-08-10");

    const after = computeWindowCoverage(covered, window.start, window.end);
    expect(after.every((d) => d.covered)).toBe(true); // 无缺口
  });
});
