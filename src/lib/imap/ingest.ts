import { prisma } from "@/lib/db";
import { getSetting } from "@/lib/settings";
import { classifyTransactions } from "@/lib/ai-classify";
import { makeFingerprint } from "@/lib/fingerprint";
import {
  getImapConfig,
  getCursor,
  setCursor,
  fetchNewEmails,
  SUBJECT_LEGACY,
} from "./client";
import { fetchEmailsByDateRange } from "./date-range";
import { parseDailyEmail, type DailyTransaction } from "./parse-daily";
import { markDateCovered } from "./coverage";
import type { ImapConfig } from "./client";

export interface IngestResult {
  fetched: number; // 拉取到的新邮件数
  inserted: number; // 新入库交易数
  skipped: number; // 因指纹重复而跳过的交易数
}

/**
 * 从 Card 表读取 IMAP 配置。
 */
async function getCardImapConfig(cardId: string): Promise<{
  config: ImapConfig;
  subject: string;
}> {
  const card = await prisma.card.findUnique({
    where: { id: cardId },
    select: {
      imapHost: true,
      imapPort: true,
      imapUser: true,
      imapPassword: true,
      imapSubject: true,
      isActive: true,
    },
  });

  if (!card) {
    throw new Error(`卡片不存在：${cardId}`);
  }
  if (!card.isActive) {
    throw new Error(`卡片已停用：${cardId}`);
  }

  return {
    config: {
      host: card.imapHost,
      port: card.imapPort,
      user: card.imapUser,
      pass: card.imapPassword,
    },
    subject: card.imapSubject,
  };
}

/**
 * 获取卡级 UID 游标键名。
 */
function getCursorKey(cardId: string): string {
  return `imap_last_uid_${cardId}`;
}

/**
 * 读取卡级 UID 游标。
 */
async function getCardCursor(cardId: string): Promise<number> {
  const key = getCursorKey(cardId);
  const value = await getSetting(key);
  return value ? Number(value) : 0;
}

/**
 * 更新卡级 UID 游标。
 */
async function setCardCursor(cardId: string, uid: number): Promise<void> {
  const key = getCursorKey(cardId);
  await prisma.setting.upsert({
    where: { key },
    create: { key, value: String(uid) },
    update: { value: String(uid) },
  });
}

/**
 * 处理一封邮件：解析 → 指纹去重入库 → 记录覆盖度。
 * 返回本封邮件新入库交易的 id（供后续 AI 分类）。
 */
async function processEmail(
  email: { text?: string; html?: string },
  cardId: string,
  result: IngestResult,
): Promise<string[]> {
  const insertedIds: string[] = [];
  const { transactions, coveredDates } = parseDailyEmail({
    text: email.text,
    html: email.html,
  });

  for (const tx of transactions) {
    const outcome = await upsertDailyTransaction(tx, cardId);
    if (outcome.inserted) {
      result.inserted += 1;
      insertedIds.push(outcome.id);
    } else {
      result.skipped += 1;
    }
  }

  // 记录该卡的覆盖日期
  for (const date of coveredDates) {
    await markDateCovered(date, cardId);
  }

  return insertedIds;
}

/**
 * 执行一次日推送抓取（卡级）：
 *   拉新邮件 → 解析 → 指纹去重入库 → AI 分类 → 推进游标
 *
 * 游标只推进到「最后一封成功处理」的邮件 UID：任一邮件处理失败即中断，
 * 保证下次从失败处重试，不丢邮件。
 */
export async function runDailyIngest(cardId: string): Promise<IngestResult> {
  const { config, subject } = await getCardImapConfig(cardId);
  const cursor = await getCardCursor(cardId);
  const emails = await fetchNewEmails(config, cursor, subject);

  const result: IngestResult = {
    fetched: emails.length,
    inserted: 0,
    skipped: 0,
  };
  if (emails.length === 0) return result;

  const newlyInsertedIds: string[] = [];

  for (const email of emails) {
    const ids = await processEmail(email, cardId, result);
    newlyInsertedIds.push(...ids);

    // 该邮件全部交易处理成功，推进游标
    await setCardCursor(cardId, email.uid);
  }

  // AI 分类仅针对本次新入库的交易（best-effort，失败不影响入库）
  if (newlyInsertedIds.length > 0) {
    await classifyNewTransactions(newlyInsertedIds);
  }

  return result;
}

/**
 * 按日期范围重新拉取日推邮件（补齐缺口，卡级）。不使用/推进 UID 游标 ——
 * 补拉是针对历史日期的独立操作，与增量游标互不干扰。
 * 邮箱中确无对应邮件时返回 fetched=0，不报错。
 */
export async function runDateRangeIngest(
  cardId: string,
  start: string,
  end: string,
): Promise<IngestResult> {
  const { config, subject } = await getCardImapConfig(cardId);
  const emails = await fetchEmailsByDateRange(config, start, end, subject);

  const result: IngestResult = {
    fetched: emails.length,
    inserted: 0,
    skipped: 0,
  };
  if (emails.length === 0) return result;

  const newlyInsertedIds: string[] = [];
  for (const email of emails) {
    const ids = await processEmail(email, cardId, result);
    newlyInsertedIds.push(...ids);
  }

  if (newlyInsertedIds.length > 0) {
    await classifyNewTransactions(newlyInsertedIds);
  }

  return result;
}

/**
 * 向后兼容：使用全局 IMAP 配置执行增量拉取（无 cardId）。
 * 保留用于旧的 /api/ingest/daily 端点。新交易不绑定 cardId。
 */
export async function runDailyIngestLegacy(): Promise<IngestResult> {
  const config = getImapConfig();
  const cursor = await getCursor();
  const emails = await fetchNewEmails(config, cursor, SUBJECT_LEGACY);

  const result: IngestResult = {
    fetched: emails.length,
    inserted: 0,
    skipped: 0,
  };
  if (emails.length === 0) return result;

  const newlyInsertedIds: string[] = [];

  for (const email of emails) {
    const insertedIds: string[] = [];
    const { transactions, coveredDates } = parseDailyEmail({
      text: email.text,
      html: email.html,
    });

    for (const tx of transactions) {
      const outcome = await upsertDailyTransaction(tx, null);
      if (outcome.inserted) {
        result.inserted += 1;
        insertedIds.push(outcome.id);
      } else {
        result.skipped += 1;
      }
    }

    // 全局覆盖度键（cardId = null）
    for (const date of coveredDates) {
      await markDateCovered(date, null);
    }

    newlyInsertedIds.push(...insertedIds);
    await setCursor(email.uid);
  }

  if (newlyInsertedIds.length > 0) {
    await classifyNewTransactions(newlyInsertedIds);
  }

  return result;
}

/**
 * 指纹去重插入单笔日推送交易。
 * 指纹已存在（来自更早的日推送或月账单）→ 跳过，不覆盖。
 */
async function upsertDailyTransaction(
  tx: DailyTransaction,
  cardId: string | null,
): Promise<{ inserted: boolean; id: string }> {
  const fingerprint = makeFingerprint({
    txDate: tx.txDate,
    cardLast4: tx.cardLast4,
    amount: tx.amount,
  });

  const existing = await prisma.transaction.findUnique({
    where: { fingerprint },
    select: { id: true },
  });
  if (existing) return { inserted: false, id: existing.id };

  const created = await prisma.transaction.create({
    data: {
      uploadId: null,
      cardId,
      txDate: new Date(tx.txDate),
      txTime: tx.txTime,
      merchant: tx.merchant,
      amount: tx.amount,
      currency: tx.currency,
      type: tx.type,
      cardLast4: tx.cardLast4,
      txStatus: "未入账",
      source: "daily",
      fingerprint,
    },
    select: { id: true },
  });
  return { inserted: true, id: created.id };
}

/**
 * 复用现有 AI 分类逻辑为新交易打标签。无 key 或无规则时静默跳过。
 */
async function classifyNewTransactions(ids: string[]): Promise<void> {
  try {
    const [apiKey, rules] = await Promise.all([
      getSetting("ANTHROPIC_API_KEY"),
      prisma.rule.findMany({
        where: { enabled: true },
        include: { category: true },
        orderBy: { priority: "desc" },
      }),
    ]);
    if (!apiKey || rules.length === 0) return;

    const validCategoryIds = new Set(rules.map((r) => r.categoryId));
    const txs = await prisma.transaction.findMany({
      where: { id: { in: ids } },
      select: { id: true, merchant: true, amount: true },
    });
    const classifications = await classifyTransactions(
      txs.map((t) => ({
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
  } catch {
    /* silent — classification is optional */
  }
}
