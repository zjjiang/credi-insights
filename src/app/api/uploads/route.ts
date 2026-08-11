import { NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { prisma } from "@/lib/db";
import { parseMsgFile } from "@/lib/msg/parser";
import { getSetting } from "@/lib/settings";
import { classifyTransactions } from "@/lib/ai-classify";
import { makeFingerprint } from "@/lib/fingerprint";
import { didGraduateFromDaily } from "@/lib/graduation";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file");

    if (!file || !(file instanceof Blob)) {
      return NextResponse.json(
        { success: false, error: "Missing file field" },
        { status: 400 },
      );
    }

    const originalName =
      file instanceof File ? file.name : `upload-${Date.now()}.msg`;
    const buffer = Buffer.from(await file.arrayBuffer());

    const uploadDir = path.join(process.cwd(), "data/uploads");
    await mkdir(uploadDir, { recursive: true });

    const { createId } = await import("@paralleldrive/cuid2");
    const fileName = `${createId()}.msg`;
    const filePath = path.join(uploadDir, fileName);
    await writeFile(filePath, buffer);

    const upload = await prisma.upload.create({
      data: { originalName, filePath, status: "PROCESSING" },
    });

    let result;
    try {
      result = await parseMsgFile(filePath);
    } catch (err) {
      await prisma.upload.update({
        where: { id: upload.id },
        data: { status: "FAILED" },
      });
      throw err;
    }

    // 指纹去重合并：月账单为准。命中已有记录（多为日推送）时覆盖元数据，
    // 但保留用户已打的 categoryId；无匹配则新增。只对新增交易做 AI 分类。
    const newlyInsertedIds: string[] = [];
    for (const t of result.transactions) {
      const cardLast4 = t.cardLast4 ?? result.cardLast4;
      const fingerprint = makeFingerprint({
        txDate: t.txDate,
        cardLast4,
        amount: t.amount,
      });

      const existing = await prisma.transaction.findUnique({
        where: { fingerprint },
        select: { id: true, source: true },
      });

      if (existing) {
        // 覆盖元数据，source 归为月账单，绑定到本次 upload；不动 categoryId。
        // 若原记录来自日推，标记 graduatedFromDaily 供月账单 Tab 高亮。
        await prisma.transaction.update({
          where: { id: existing.id },
          data: {
            uploadId: upload.id,
            txDate: new Date(t.txDate),
            merchant: t.merchant,
            amount: t.amount,
            currency: t.currency,
            type: t.type,
            cardLast4,
            txStatus: t.txStatus,
            source: "bill",
            graduatedFromDaily: didGraduateFromDaily(existing.source),
          },
        });
      } else {
        const created = await prisma.transaction.create({
          data: {
            uploadId: upload.id,
            txDate: new Date(t.txDate),
            merchant: t.merchant,
            amount: t.amount,
            currency: t.currency,
            type: t.type,
            cardLast4,
            txStatus: t.txStatus,
            source: "bill",
            fingerprint,
          },
          select: { id: true },
        });
        newlyInsertedIds.push(created.id);
      }
    }

    await prisma.upload.update({
      where: { id: upload.id },
      data: {
        status: "DONE",
        imageMonth: result.imageMonth,
        billingStart: result.billingStart
          ? new Date(result.billingStart)
          : undefined,
        billingEnd: result.billingEnd ? new Date(result.billingEnd) : undefined,
        dueDate: result.dueDate ? new Date(result.dueDate) : undefined,
        cardLast4: result.cardLast4,
        txCount: result.transactions.length,
        parsedRawText: result.rawText.slice(0, 65535),
      },
    });

    // AI auto-classify (best-effort, don't fail upload if this errors)
    try {
      const [apiKey, rules] = await Promise.all([
        getSetting("ANTHROPIC_API_KEY"),
        prisma.rule.findMany({
          where: { enabled: true },
          include: { category: true },
          orderBy: { priority: "desc" },
        }),
      ]);
      if (apiKey && rules.length > 0 && newlyInsertedIds.length > 0) {
        const validCategoryIds = new Set(rules.map((r) => r.categoryId));
        const createdTxs = await prisma.transaction.findMany({
          where: { id: { in: newlyInsertedIds } },
          select: { id: true, merchant: true, amount: true },
        });
        const classifications = await classifyTransactions(
          createdTxs.map((t) => ({
            id: t.id,
            merchant: t.merchant,
            amount: Number(t.amount),
          })),
          rules.map((r) => ({
            description: r.description,
            categoryId: r.categoryId,
            categoryName: r.category.name,
          })),
        );
        for (const { txId, categoryId } of classifications) {
          if (!validCategoryIds.has(categoryId)) continue;
          await prisma.transaction.update({
            where: { id: txId },
            data: { categoryId },
          });
        }
      }
    } catch {
      /* silent — classification is optional */
    }

    return NextResponse.json({ success: true, data: { uploadId: upload.id } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Upload failed";
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 },
    );
  }
}

export async function GET() {
  try {
    const uploads = await prisma.upload.findMany({
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json({ success: true, data: uploads });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to fetch uploads";
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 },
    );
  }
}
