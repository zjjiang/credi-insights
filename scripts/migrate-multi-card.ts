/**
 * 数据迁移：多卡架构
 *
 * 1. 为现有交易推断并绑定 cardId（基于 cardLast4）
 * 2. 为现有上传推断并绑定 cardId
 * 3. 将全局 `daily_covered_dates` 拆分到各卡片
 *
 * 用法：
 *   node --loader ts-node/esm scripts/migrate-multi-card.ts
 */

import { prisma } from "../src/lib/db";
import { COVERAGE_KEY_PREFIX, getCoverageKey } from "../src/lib/imap/coverage";

async function main() {
  console.log("开始多卡架构数据迁移...\n");

  // 1. 收集现有交易中的所有卡号
  const distinctCards = await prisma.transaction.findMany({
    where: { cardLast4: { not: null } },
    select: { cardLast4: true },
    distinct: ["cardLast4"],
  });

  console.log(`发现 ${distinctCards.length} 个不同的卡号`);

  if (distinctCards.length === 0) {
    console.log("无卡号数据，跳过迁移");
    return;
  }

  // 2. 为每个卡号创建 Card 记录（如不存在）
  const cardMap = new Map<string, string>(); // cardLast4 -> cardId

  for (const { cardLast4 } of distinctCards) {
    if (!cardLast4) continue;

    let card = await prisma.card.findFirst({
      where: { cardLast4, isActive: true },
      select: { id: true },
    });

    if (!card) {
      card = await prisma.card.create({
        data: {
          bank: "招商银行", // 默认值，用户可后续修改
          cardLast4,
          alias: `卡片 ${cardLast4}`,
          billingDay: 1, // 占位符，需用户后续填写
          dueDay: 20, // 占位符，需用户后续填写
          imapHost: "imap.qq.com", // 占位符，需用户后续填写
          imapPort: 993,
          imapUser: "PLACEHOLDER@qq.com", // 占位符，需用户后续填写
          imapPassword: "CHANGE_ME", // 占位符，需用户后续填写
          imapSubject: "每日信用管家",
        },
        select: { id: true },
      });
      console.log(
        `✓ 创建卡片: ${cardLast4} (${card.id}) - 请在卡片管理中完善 IMAP 配置`,
      );
    } else {
      console.log(`✓ 卡片已存在: ${cardLast4} (${card.id})`);
    }

    cardMap.set(cardLast4, card.id);
  }

  // 3. 绑定交易到卡片
  console.log("\n绑定交易到卡片...");
  let txUpdated = 0;

  for (const [cardLast4, cardId] of cardMap.entries()) {
    const result = await prisma.transaction.updateMany({
      where: { cardLast4, cardId: null },
      data: { cardId },
    });
    txUpdated += result.count;
    console.log(`  ${cardLast4} → ${result.count} 笔交易`);
  }

  console.log(`✓ 共更新 ${txUpdated} 笔交易`);

  // 4. 绑定上传到卡片
  console.log("\n绑定上传记录到卡片...");
  let uploadUpdated = 0;

  for (const [cardLast4, cardId] of cardMap.entries()) {
    const result = await prisma.upload.updateMany({
      where: { cardLast4, cardId: null },
      data: { cardId },
    });
    uploadUpdated += result.count;
    console.log(`  ${cardLast4} → ${result.count} 个账单`);
  }

  console.log(`✓ 共更新 ${uploadUpdated} 个上传记录`);

  // 5. 拆分全局覆盖度到各卡片
  console.log("\n拆分覆盖度数据...");
  const globalCoverage = await prisma.setting.findUnique({
    where: { key: "daily_covered_dates" },
    select: { value: true },
  });

  if (globalCoverage?.value) {
    try {
      const dates = JSON.parse(globalCoverage.value) as string[];
      console.log(`全局覆盖度包含 ${dates.length} 个日期`);

      // 将全局覆盖度复制到每张卡
      for (const [cardLast4, cardId] of cardMap.entries()) {
        const key = `daily_covered_dates_${cardId}`;
        const existing = await prisma.setting.findUnique({
          where: { key },
          select: { key: true },
        });

        if (!existing) {
          await prisma.setting.create({
            data: { key, value: JSON.stringify(dates) },
          });
          console.log(`  ${cardLast4} → 复制 ${dates.length} 个日期`);
        } else {
          console.log(`  ${cardLast4} → 覆盖度已存在，跳过`);
        }
      }

      console.log("✓ 覆盖度拆分完成");
    } catch (err) {
      console.error("解析全局覆盖度失败:", err);
    }
  } else {
    console.log("无全局覆盖度数据，跳过");
  }

  console.log("\n✅ 多卡架构迁移完成");
}

main()
  .catch((e) => {
    console.error("迁移失败:", e);
    process.exit(1);
  })
  .finally(() => {
    void prisma.$disconnect();
  });
