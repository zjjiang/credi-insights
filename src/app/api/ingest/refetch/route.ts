import { NextResponse } from "next/server";
import { runDateRangeIngest } from "@/lib/imap/ingest";
import { isIngestAuthorized } from "@/lib/imap/ingest-auth";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * POST /api/ingest/refetch
 * body: { start: "YYYY-MM-DD", end?: "YYYY-MM-DD" }
 * 按日期范围补拉日推邮件（补齐缺口）。end 省略时等于 start（单日补拉）。
 * 鉴权同 /api/ingest/daily。
 *
 * 注意：此端点为向后兼容保留，仅对默认卡片执行补拉。
 * 多卡场景下建议使用 POST /api/cards/[id]/refetch 分别触发各卡补拉。
 */
export async function POST(request: Request) {
  try {
    if (!isIngestAuthorized(request)) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 },
      );
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { success: false, error: "请求体须为 JSON" },
        { status: 400 },
      );
    }

    const { start, end } = (body ?? {}) as { start?: string; end?: string };
    const endDate = end ?? start;
    if (!start || !DATE_RE.test(start) || !endDate || !DATE_RE.test(endDate)) {
      return NextResponse.json(
        { success: false, error: "start/end 须为 YYYY-MM-DD 格式，start 必填" },
        { status: 400 },
      );
    }

    // 查询默认卡片（向后兼容逻辑）
    const defaultCard = await prisma.card.findFirst({
      where: { isActive: true },
      orderBy: { createdAt: "asc" },
      select: { id: true },
    });

    if (!defaultCard) {
      return NextResponse.json(
        { success: false, error: "未找到可用卡片，请先在卡片管理中添加" },
        { status: 400 },
      );
    }

    const result = await runDateRangeIngest(defaultCard.id, start, endDate);
    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Refetch failed";
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 },
    );
  }
}
