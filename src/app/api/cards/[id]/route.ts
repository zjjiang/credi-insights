import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

interface Params {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/cards/[id]
 * 查询单张卡片详情（不返回密码）
 */
export async function GET(request: Request, { params }: Params) {
  try {
    const { id } = await params;

    const card = await prisma.card.findUnique({
      where: { id },
      include: {
        transactions: {
          where: { source: "daily" },
          orderBy: { createdAt: "desc" },
          take: 1,
          select: { createdAt: true },
        },
      },
    });

    if (!card) {
      return NextResponse.json(
        { success: false, error: "卡片不存在" },
        { status: 404 },
      );
    }

    // 统计数据
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

    const [monthlyResult, txCount] = await Promise.all([
      prisma.transaction.aggregate({
        where: {
          cardId: card.id,
          type: "DEBIT",
          txDate: { gte: monthStart, lte: monthEnd },
        },
        _sum: { amount: true },
      }),
      prisma.transaction.count({ where: { cardId: card.id } }),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        id: card.id,
        bank: card.bank,
        cardLast4: card.cardLast4,
        alias: card.alias,
        billingDay: card.billingDay,
        dueDay: card.dueDay,
        imapHost: card.imapHost,
        imapPort: card.imapPort,
        imapUser: card.imapUser,
        imapSubject: card.imapSubject,
        isActive: card.isActive,
        stats: {
          monthlyTotal: Number(monthlyResult._sum.amount ?? 0),
          lastSyncAt: card.transactions[0]?.createdAt.toISOString() ?? null,
          transactionCount: txCount,
        },
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "查询卡片失败";
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 },
    );
  }
}

/**
 * PATCH /api/cards/[id]
 * 更新卡片配置
 */
export async function PATCH(request: Request, { params }: Params) {
  try {
    const { id } = await params;
    const body = await request.json();

    const card = await prisma.card.findUnique({ where: { id } });
    if (!card) {
      return NextResponse.json(
        { success: false, error: "卡片不存在" },
        { status: 404 },
      );
    }

    // 校验范围（如果提供）
    if (
      (body.billingDay && (body.billingDay < 1 || body.billingDay > 31)) ||
      (body.dueDay && (body.dueDay < 1 || body.dueDay > 31))
    ) {
      return NextResponse.json(
        { success: false, error: "账单日/还款日必须在 1-31 之间" },
        { status: 400 },
      );
    }

    // 检查唯一性（如果更新 bank 或 cardLast4）
    if (body.bank || body.cardLast4) {
      const checkBank = body.bank ?? card.bank;
      const checkLast4 = body.cardLast4 ?? card.cardLast4;
      const existing = await prisma.card.findUnique({
        where: { bank_cardLast4: { bank: checkBank, cardLast4: checkLast4 } },
      });
      if (existing && existing.id !== id) {
        return NextResponse.json(
          { success: false, error: "该卡片已存在" },
          { status: 400 },
        );
      }
    }

    await prisma.card.update({
      where: { id },
      data: body,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "更新卡片失败";
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 },
    );
  }
}

/**
 * DELETE /api/cards/[id]
 * 软删除卡片（isActive = false）
 */
export async function DELETE(request: Request, { params }: Params) {
  try {
    const { id } = await params;

    const card = await prisma.card.findUnique({ where: { id } });
    if (!card) {
      return NextResponse.json(
        { success: false, error: "卡片不存在" },
        { status: 404 },
      );
    }

    await prisma.card.update({
      where: { id },
      data: { isActive: false },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "删除卡片失败";
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 },
    );
  }
}
