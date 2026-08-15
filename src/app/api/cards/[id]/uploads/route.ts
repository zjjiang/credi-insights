import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

interface Params {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/cards/[id]/uploads
 * 返回该卡的历史账单列表，按账期倒序
 */
export async function GET(_request: Request, { params }: Params) {
  try {
    const { id } = await params;

    const card = await prisma.card.findUnique({ where: { id } });
    if (!card) {
      return NextResponse.json(
        { success: false, error: "卡片不存在" },
        { status: 404 },
      );
    }

    const uploads = await prisma.upload.findMany({
      where: { cardId: id },
      orderBy: [{ billingStart: "desc" }, { createdAt: "desc" }],
      select: {
        id: true,
        originalName: true,
        imageMonth: true,
        billingStart: true,
        billingEnd: true,
        dueDate: true,
        status: true,
        txCount: true,
        createdAt: true,
      },
    });

    return NextResponse.json({ success: true, data: uploads });
  } catch (error) {
    const message = error instanceof Error ? error.message : "查询账单失败";
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 },
    );
  }
}
