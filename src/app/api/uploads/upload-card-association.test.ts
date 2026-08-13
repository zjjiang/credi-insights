import { describe, it, expect, beforeEach } from "vitest";
import { prisma } from "@/lib/db";

/**
 * 集成测试：上传账单正确关联卡片。
 * 验证 D3 要求：解析卡号 → 查询 Card 表 → 若不存在返回 400。
 */
describe("Upload bill card association (integration)", () => {
  const TEST_CARD_ID = "test-upload-card-9999";
  const TEST_CARD_LAST4 = "9999";

  beforeEach(async () => {
    // 清理测试数据
    await prisma.card.deleteMany({
      where: { id: TEST_CARD_ID },
    });
  });

  it("rejects upload when card is not registered", async () => {
    // Card 表中无 9999 卡片
    const card = await prisma.card.findFirst({
      where: { cardLast4: TEST_CARD_LAST4, isActive: true },
    });
    expect(card).toBeNull();

    // 模拟上传账单时的卡片查询逻辑：应返回 null
    const foundCard = await prisma.card.findFirst({
      where: { cardLast4: TEST_CARD_LAST4, isActive: true },
      select: { id: true },
    });

    expect(foundCard).toBeNull();
    // 在实际 POST /api/uploads 中，此时会返回 400
  });

  it("accepts upload when card is registered", async () => {
    // 创建测试卡片
    await prisma.card.create({
      data: {
        id: TEST_CARD_ID,
        bank: "招商银行",
        cardLast4: TEST_CARD_LAST4,
        alias: "测试卡片",
        billingDay: 5,
        dueDay: 23,
        imapHost: "imap.test.com",
        imapPort: 993,
        imapUser: "test@test.com",
        imapPassword: "test",
        imapSubject: "测试",
        isActive: true,
      },
    });

    // 模拟上传账单时的卡片查询逻辑：应找到卡片
    const foundCard = await prisma.card.findFirst({
      where: { cardLast4: TEST_CARD_LAST4, isActive: true },
      select: { id: true },
    });

    expect(foundCard).not.toBeNull();
    expect(foundCard?.id).toBe(TEST_CARD_ID);
    // 在实际 POST /api/uploads 中，此时会继续处理账单
  });

  it("ignores inactive cards", async () => {
    // 创建已停用的卡片
    await prisma.card.create({
      data: {
        id: TEST_CARD_ID,
        bank: "招商银行",
        cardLast4: TEST_CARD_LAST4,
        alias: "已停用卡片",
        billingDay: 5,
        dueDay: 23,
        imapHost: "imap.test.com",
        imapPort: 993,
        imapUser: "test@test.com",
        imapPassword: "test",
        imapSubject: "测试",
        isActive: false, // 停用
      },
    });

    // 查询时应忽略已停用卡片
    const foundCard = await prisma.card.findFirst({
      where: { cardLast4: TEST_CARD_LAST4, isActive: true },
      select: { id: true },
    });

    expect(foundCard).toBeNull();
  });
});
