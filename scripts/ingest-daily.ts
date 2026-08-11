import 'dotenv/config'
import { runDailyIngest } from '../src/lib/imap/ingest'

/**
 * CLI 入口：手动触发日推送抓取，可用于 crontab。
 *   npx tsx scripts/ingest-daily.ts
 * 或
 *   npm run ingest
 */
async function main() {
  try {
    const result = await runDailyIngest()
    console.log(
      `[ingest] fetched=${result.fetched} inserted=${result.inserted} skipped=${result.skipped}`,
    )
    process.exit(0)
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error(`[ingest] failed: ${message}`)
    process.exit(1)
  }
}

main()
