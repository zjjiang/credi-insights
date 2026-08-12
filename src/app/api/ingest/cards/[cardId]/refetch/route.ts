import { NextResponse } from "next/server";
import { runDateRangeIngest } from "@/lib/imap/ingest";
import { isIngestAuthorized } from "@/lib/imap/ingest-auth";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

interface Params {
  params: Promise<{ cardId: string }>;
}

/**
 * POST /api/ingest/cards/[cardId]/refetch
 * 按日期范围重新拉取该卡的日推邮件（补齐缺口）。
 * Body: { start: "YYYY-MM-DD", end?: "YYYY-MM-DD" }
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
    const body = await request.json();
    const { start, end } = body;

    if (!start || !/^\d{4}-\d{2}-\d{2}$/.test(start)) {
      return NextResponse.json(
        { success: false, error: "start 必须为 YYYY-MM-DD 格式" },
        { status: 400 },
      );
    }

    const endDate = end ?? start;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(endDate)) {
      return NextResponse.json(
        { success: false, error: "end 必须为 YYYY-MM-DD 格式" },
        { status: 400 },
      );
    }

    const result = await runDateRangeIngest(cardId, start, endDate);
    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Refetch failed";
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 },
    );
  }
}
