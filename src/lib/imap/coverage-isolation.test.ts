import { describe, it, expect, beforeEach } from "vitest";
import { prisma } from "@/lib/db";
import { getCoveredDates, markDateCovered } from "./coverage";

/**
 * 集成测试：多卡场景下覆盖度互不干扰。
 * 验证 D9 要求：每张卡的覆盖度独立存储、独立查询。
 */
describe("Multi-card coverage isolation (integration)", () => {
  const CARD_A = "test-card-a-1234";
  const CARD_B = "test-card-b-5678";

  beforeEach(async () => {
    // 清理测试数据
    await prisma.setting.deleteMany({
      where: {
        key: {
          in: [
            `daily_covered_dates_${CARD_A}`,
            `daily_covered_dates_${CARD_B}`,
          ],
        },
      },
    });
  });

  it("marks dates for card A without affecting card B", async () => {
    await markDateCovered("2026-08-10", CARD_A);
    await markDateCovered("2026-08-11", CARD_A);

    const coveredA = await getCoveredDates(CARD_A);
    const coveredB = await getCoveredDates(CARD_B);

    expect(coveredA).toEqual(["2026-08-10", "2026-08-11"]);
    expect(coveredB).toEqual([]);
  });

  it("marks dates for card B without affecting card A", async () => {
    await markDateCovered("2026-08-12", CARD_B);

    const coveredA = await getCoveredDates(CARD_A);
    const coveredB = await getCoveredDates(CARD_B);

    expect(coveredA).toEqual([]);
    expect(coveredB).toEqual(["2026-08-12"]);
  });

  it("allows overlapping dates across cards (independent tracking)", async () => {
    await markDateCovered("2026-08-15", CARD_A);
    await markDateCovered("2026-08-15", CARD_B);
    await markDateCovered("2026-08-16", CARD_A);

    const coveredA = await getCoveredDates(CARD_A);
    const coveredB = await getCoveredDates(CARD_B);

    expect(coveredA).toEqual(["2026-08-15", "2026-08-16"]);
    expect(coveredB).toEqual(["2026-08-15"]);
  });
});
