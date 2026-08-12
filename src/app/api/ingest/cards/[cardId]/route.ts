import { NextResponse } from "next/server";
import { runDailyIngest } from "@/lib/imap/ingest";
import { isIngestAuthorized } from "@/lib/imap/ingest-auth";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

interface Params {
  params: Promise<{ cardId: string }>;
}

/**
 * POST /api/ingest/cards/[cardId]
 * 触发该卡的增量日推抓取（使用卡级 IMAP 配置和 UID 游标）。
 */
export async function POST(request: Request, { params }: Params) {
  try {
    if (!isIngestAuthorized(request)) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 },
      );
    }

    const { cardId } = await params;
    const result = await runDailyIngest(cardId);
    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Ingest failed";
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 },
    );
  }
}
