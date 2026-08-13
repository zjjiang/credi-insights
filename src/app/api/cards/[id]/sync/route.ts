import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { runDailyIngest } from "@/lib/imap/ingest";

export const dynamic = "force-dynamic";

/**
 * POST /api/cards/[id]/sync
 *
 * 触发指定卡片的 IMAP 日推同步（增量抓取）
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const card = await prisma.card.findUnique({
      where: { id },
      select: {
        id: true,
        isActive: true,
        imapHost: true,
        imapPort: true,
        imapUser: true,
        imapPassword: true,
      },
    });

    if (!card || !card.isActive) {
      return NextResponse.json(
        { success: false, error: "卡片不存在或已停用" },
        { status: 404 },
      );
    }

    // 检查 IMAP 配置是否完整
    if (
      !card.imapHost ||
      !card.imapPort ||
      !card.imapUser ||
      !card.imapPassword
    ) {
      return NextResponse.json(
        { success: false, error: "IMAP 配置不完整，请先在设置中配置" },
        { status: 400 },
      );
    }

    const result = await runDailyIngest(id);

    return NextResponse.json({
      success: true,
      data: {
        newEmails: result.fetched,
        newTransactions: result.inserted,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "同步失败";
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 },
    );
  }
}
