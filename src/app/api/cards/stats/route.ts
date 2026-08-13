import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

/**
 * GET /api/cards/stats
 *
 * 返回每张卡本月累计支出/收入（基于自然月）。
 */
export async function GET() {
  try {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);

    const cards = await prisma.card.findMany({
      where: { isActive: true },
      select: { id: true },
    });

    const stats = await Promise.all(
      cards.map(async (card) => {
        const txs = await prisma.transaction.findMany({
          where: {
            cardId: card.id,
            txDate: { gte: monthStart, lt: monthEnd },
          },
          select: { type: true, amount: true },
        });

        let monthDebit = 0;
        let monthCredit = 0;
        for (const tx of txs) {
          const amt = Number(tx.amount);
          if (tx.type === "DEBIT") monthDebit += amt;
          else monthCredit += amt;
        }

        return { cardId: card.id, monthDebit, monthCredit };
      }),
    );

    return NextResponse.json({ success: true, data: stats });
  } catch (error) {
    const message = error instanceof Error ? error.message : "查询失败";
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 },
    );
  }
}
