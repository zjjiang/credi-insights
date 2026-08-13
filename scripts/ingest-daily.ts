import "dotenv/config";
import { prisma } from "../src/lib/db";
import { runDailyIngest } from "../src/lib/imap/ingest";

/**
 * CLI 入口：手动触发所有活跃卡片的日推抓取，可用于 crontab。
 *   npx tsx scripts/ingest-daily.ts
 * 或
 *   npm run ingest
 *
 * 多卡架构：自动遍历所有活跃卡片，依次执行增量抓取。
 */
async function main() {
  try {
    const activeCards = await prisma.card.findMany({
      where: { isActive: true },
      select: { id: true, alias: true, cardLast4: true },
    });

    if (activeCards.length === 0) {
      console.log("[ingest] 无活跃卡片");
      process.exit(0);
    }

    let totalFetched = 0;
    let totalInserted = 0;
    let totalSkipped = 0;

    for (const card of activeCards) {
      const displayName = card.alias || `卡片 *${card.cardLast4}`;
      console.log(`[ingest] 处理: ${displayName} (${card.id})`);
      const result = await runDailyIngest(card.id);
      console.log(
        `  fetched=${result.fetched} inserted=${result.inserted} skipped=${result.skipped}`,
      );
      totalFetched += result.fetched;
      totalInserted += result.inserted;
      totalSkipped += result.skipped;
    }

    console.log(
      `[ingest] 完成 - 总计: fetched=${totalFetched} inserted=${totalInserted} skipped=${totalSkipped}`,
    );
    process.exit(0);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[ingest] failed: ${message}`);
    process.exit(1);
  }
}

main();
