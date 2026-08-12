import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { groupTransactionsByDay } from "@/lib/daily/group-by-day";

export const dynamic = "force-dynamic";

const DEFAULT_WINDOW_DAYS = 45;
const MAX_WINDOW_DAYS = 366;

/**
 * GET /api/transactions/by-day?days=45&before=YYYY-MM-DD
 *
 * 按自然日分组、日期倒序返回交易（含每日总额）。只返回有交易的日期。
 * - days: 窗口天数（默认 45，上限 366）
 * - before: 窗口结束日（含），默认今天。向前翻页时传上一页最早日期的前一天。
 */
export async function GET(request: Request) {
  try {
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
    const endDate = end.toISOString().split("T")[0];

    const start = new Date(`${endDate}T00:00:00`);
    start.setDate(start.getDate() - (days - 1));
    const startDate = start.toISOString().split("T")[0];

    // 窗口内交易（闭区间 [start, end]）
    const endExclusive = new Date(`${endDate}T00:00:00`);
    endExclusive.setDate(endExclusive.getDate() + 1);
    const transactions = await prisma.transaction.findMany({
      where: { txDate: { gte: start, lt: endExclusive } },
      include: { category: true },
      orderBy: [{ txDate: "desc" }, { txTime: "desc" }],
    });

    // 按发生日分组，倒序，只返回有交易的日期
    const grouped = groupTransactionsByDay(transactions);

    const dayEntries = grouped.map((day) => ({
      date: day.date,
      debit: day.debit,
      credit: day.credit,
      transactions: day.transactions.map(serializeTx),
    }));

    return NextResponse.json({
      success: true,
      data: {
        window: { start: startDate, end: endDate, days },
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

type TxWithCategory = Awaited<
  ReturnType<typeof prisma.transaction.findMany>
>[number] & { category: unknown };

function serializeTx(tx: TxWithCategory) {
  const t = tx as Record<string, unknown> & {
    category: {
      id: string;
      name: string;
      icon: string | null;
      color: string | null;
    } | null;
  };
  return {
    id: t.id,
    txDate: (t.txDate as Date).toISOString(),
    txTime: t.txTime ?? null,
    merchant: t.merchant,
    amount: Number(t.amount),
    currency: t.currency,
    type: t.type,
    cardLast4: t.cardLast4 ?? null,
    txStatus: t.txStatus ?? null,
    source: t.source,
    graduatedFromDaily: t.graduatedFromDaily ?? false,
    categoryId: t.categoryId ?? null,
    category: t.category
      ? {
          id: t.category.id,
          name: t.category.name,
          icon: t.category.icon,
          color: t.category.color,
        }
      : null,
  };
}
