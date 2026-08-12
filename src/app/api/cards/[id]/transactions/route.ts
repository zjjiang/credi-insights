import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import {
  getCoveredDates,
  computeWindowCoverage,
  normalizeCoverageDate,
} from "@/lib/imap/coverage";
import { groupTransactionsByDay } from "@/lib/daily/group-by-day";

export const dynamic = "force-dynamic";

const DEFAULT_WINDOW_DAYS = 45;
const MAX_WINDOW_DAYS = 366;

interface Params {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/cards/[id]/transactions?days=45&before=YYYY-MM-DD
 *
 * 按自然日分组、日期倒序返回该卡的交易（含每日总额与覆盖状态）。
 */
export async function GET(request: Request, { params }: Params) {
  try {
    const { id: cardId } = await params;

    // 验证卡片存在
    const card = await prisma.card.findUnique({
      where: { id: cardId },
      select: { id: true },
    });

    if (!card) {
      return NextResponse.json(
        { success: false, error: "卡片不存在" },
        { status: 404 },
      );
    }

    const { searchParams } = new URL(request.url);
    const daysParam = Number(searchParams.get("days") ?? DEFAULT_WINDOW_DAYS);
    const days =
      Number.isFinite(daysParam) && daysParam > 0
        ? Math.min(Math.floor(daysParam), MAX_WINDOW_DAYS)
        : DEFAULT_WINDOW_DAYS;

    const beforeParam = searchParams.get("before");
    const end =
      beforeParam && /^\d{4}-\d{2}-\d{2}$/.test(beforeParam)
        ? new Date(`${beforeParam}T00:00:00`)
        : new Date();
    const endDate = normalizeCoverageDate(end);

    const start = new Date(`${endDate}T00:00:00`);
    start.setDate(start.getDate() - (days - 1));
    const startDate = normalizeCoverageDate(start);

    // 窗口内交易（闭区间 [start, end]）
    const endExclusive = new Date(`${endDate}T00:00:00`);
    endExclusive.setDate(endExclusive.getDate() + 1);
    const transactions = await prisma.transaction.findMany({
      where: {
        cardId,
        txDate: { gte: start, lt: endExclusive },
      },
      include: { category: true },
      orderBy: [{ txDate: "desc" }, { txTime: "desc" }],
    });

    // 卡级覆盖状态
    const covered = await getCoveredDates(cardId);
    const coverage = computeWindowCoverage(covered, startDate, endDate);

    // 按日分组
    const dayEntries = groupTransactionsByDay(
      transactions,
      covered,
      startDate,
      endDate,
    );
    const hasGap = coverage.some((d) => !d.covered);

    return NextResponse.json({
      success: true,
      data: {
        window: { start: startDate, end: endDate, days },
        hasGap,
        days: dayEntries,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "查询失败";
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 },
    );
  }
}
