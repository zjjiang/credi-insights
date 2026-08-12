import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

/**
 * POST /api/cards
 * 创建新卡片
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      bank,
      cardLast4,
      alias,
      billingDay,
      dueDay,
      imapHost,
      imapPort,
      imapUser,
      imapPassword,
      imapSubject,
    } = body;

    // 校验必填字段
    if (!bank || !cardLast4 || !billingDay || !dueDay) {
      return NextResponse.json(
        { success: false, error: "缺少必填字段" },
        { status: 400 },
      );
    }

    if (!imapHost || !imapUser || !imapPassword || !imapSubject) {
      return NextResponse.json(
        { success: false, error: "IMAP 配置不完整" },
        { status: 400 },
      );
    }

    // 校验账单日/还款日范围
    if (
      billingDay < 1 ||
      billingDay > 31 ||
      dueDay < 1 ||
      dueDay > 31
    ) {
      return NextResponse.json(
        { success: false, error: "账单日/还款日必须在 1-31 之间" },
        { status: 400 },
      );
    }

    // 检查 bank + cardLast4 唯一性
    const existing = await prisma.card.findUnique({
      where: { bank_cardLast4: { bank, cardLast4 } },
    });

    if (existing) {
      return NextResponse.json(
        { success: false, error: "该卡片已存在" },
        { status: 400 },
      );
    }

    const card = await prisma.card.create({
      data: {
        bank,
        cardLast4,
        alias: alias ?? null,
        billingDay,
        dueDay,
        imapHost,
        imapPort: imapPort ?? 993,
        imapUser,
        imapPassword,
        imapSubject,
      },
    });

    return NextResponse.json({
      success: true,
      data: { cardId: card.id },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "创建卡片失败";
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 },
    );
  }
}

/**
 * GET /api/cards
 * 列出所有激活卡片
 */
export async function GET() {
  try {
    const cards = await prisma.card.findMany({
      where: { isActive: true },
      orderBy: { createdAt: "desc" },
      include: {
        transactions: {
          where: { source: "daily" },
          orderBy: { createdAt: "desc" },
          take: 1,
          select: { createdAt: true },
        },
      },
    });

    // 计算本月累计和最近同步时间
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

    const cardsWithStats = await Promise.all(
      cards.map(async (card) => {
        // 本月累计（type=DEBIT）
        const monthlyResult = await prisma.transaction.aggregate({
          where: {
            cardId: card.id,
            type: "DEBIT",
            txDate: { gte: monthStart, lte: monthEnd },
          },
          _sum: { amount: true },
        });

        return {
          id: card.id,
          bank: card.bank,
          cardLast4: card.cardLast4,
          alias: card.alias,
          billingDay: card.billingDay,
          dueDay: card.dueDay,
          isActive: card.isActive,
          monthlyTotal: Number(monthlyResult._sum.amount ?? 0),
          lastSyncAt: card.transactions[0]?.createdAt.toISOString() ?? null,
        };
      }),
    );

    return NextResponse.json({
      success: true,
      data: { cards: cardsWithStats },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "查询卡片失败";
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 },
    );
  }
}
