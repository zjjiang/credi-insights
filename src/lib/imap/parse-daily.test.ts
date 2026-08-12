import { describe, it, expect } from "vitest";
import { parseDailyEmail } from "./parse-daily";

const SAMPLE = `2026/07/25 您的消费明细如下：
10:26:03
CNY 28.00
尾号0094 消费 支付宝-东吴面馆
14:03:35
CNY 50.00
尾号0094 消费 支付宝-林屋洞`;

describe("parseDailyEmail", () => {
  it("extracts transactions from a sample email", () => {
    const { transactions } = parseDailyEmail({ text: SAMPLE });
    expect(transactions).toHaveLength(2);
    expect(transactions[0].merchant).toBe("支付宝-东吴面馆");
    expect(transactions[0].amount).toBe(28);
  });

  it("returns empty transactions for no-consumption email", () => {
    const { transactions } = parseDailyEmail({
      text: "2026/07/26 您的消费明细如下：\n（今日无消费）",
    });
    expect(transactions).toHaveLength(0);
  });

  it("parses multi-day email correctly", () => {
    const { transactions } = parseDailyEmail({
      text: `2026/07/25 您的消费明细如下：
10:26:03
CNY 28.00
尾号0094 消费 支付宝-A
2026/07/26 您的消费明细如下：
09:00:00
CNY 50.00
尾号0094 消费 支付宝-B`,
    });
    expect(transactions).toHaveLength(2);
    expect(transactions[0].txDate).toBe("2026-07-25");
    expect(transactions[1].txDate).toBe("2026-07-26");
  });
});
