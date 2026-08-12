import "dotenv/config";
import { runDailyIngestLegacy } from "../src/lib/imap/ingest";

/**
 * CLI 入口：手动触发日推送抓取，可用于 crontab。
 *   npx tsx scripts/ingest-daily.ts
 * 或
 *   npm run ingest
 *
 * 注意：此脚本使用 runDailyIngestLegacy()，会自动选择默认卡片。
 * 多卡场景下建议使用 POST /api/cards/[id]/sync 分别触发各卡同步。
 */
async function main() {
  try {
    const result = await runDailyIngestLegacy();
    console.log(
      `[ingest] fetched=${result.fetched} inserted=${result.inserted} skipped=${result.skipped}`,
    );
    process.exit(0);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[ingest] failed: ${message}`);
    process.exit(1);
  }
}

main();
