import { NextResponse } from 'next/server'
import { runDailyIngest } from '@/lib/imap/ingest'

// 抓取可能耗时（IMAP 往返 + AI 分类），禁用静态化并放宽超时
export const dynamic = 'force-dynamic'
export const maxDuration = 60

/**
 * POST /api/ingest/daily
 * 触发一次日推送抓取。若配置了 INGEST_SECRET，需在 header
 * `x-ingest-secret` 或 query `?secret=` 中携带匹配值。
 */
export async function POST(request: Request) {
  try {
    const secret = process.env.INGEST_SECRET
    if (secret) {
      const url = new URL(request.url)
      const provided =
        request.headers.get('x-ingest-secret') ?? url.searchParams.get('secret')
      if (provided !== secret) {
        return NextResponse.json(
          { success: false, error: 'Unauthorized' },
          { status: 401 },
        )
      }
    }

    const result = await runDailyIngest()
    return NextResponse.json({ success: true, data: result })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Ingest failed'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
