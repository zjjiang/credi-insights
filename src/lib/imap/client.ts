import { ImapFlow } from "imapflow";
import { simpleParser } from "mailparser";
import { prisma } from "@/lib/db";

const CURSOR_KEY = "imap_last_uid";
// 招行邮件经 live.cn 转发到 QQ 后，发件人变为转发者，不能再按 FROM 过滤。
// 主题里的「每日信用管家」在转发后仍保留（IMAP subject 为「包含」匹配，
// 即使带 "Fwd:"/"转发：" 前缀也能命中），故只按主题过滤。
// 多卡架构下每张卡独立配置 subject，由调用方传入。
export const SUBJECT_LEGACY = "每日信用管家"; // 仅供 legacy 函数使用

export interface ImapConfig {
  host: string;
  port: number;
  user: string;
  pass: string;
}

export interface FetchedEmail {
  uid: number;
  subject: string;
  date?: Date;
  text?: string;
  html?: string;
}

/**
 * 从环境变量读取 IMAP 配置，缺失必填项时抛错（快速失败）。
 */
export function getImapConfig(): ImapConfig {
  const host = process.env.IMAP_HOST;
  const user = process.env.IMAP_USER;
  const pass = process.env.IMAP_PASS;
  const port = Number(process.env.IMAP_PORT ?? "993");

  const missing = [
    !host && "IMAP_HOST",
    !user && "IMAP_USER",
    !pass && "IMAP_PASS",
  ].filter(Boolean);

  if (missing.length > 0) {
    throw new Error(`IMAP 配置缺失: ${missing.join(", ")}（请在 .env 中设置）`);
  }
  if (!Number.isFinite(port) || port <= 0) {
    throw new Error(`IMAP_PORT 无效: ${process.env.IMAP_PORT}`);
  }

  return { host: host!, port, user: user!, pass: pass! };
}

/**
 * 读取游标：上次已处理的最大邮件 UID。无记录返回 0。
 */
export async function getCursor(): Promise<number> {
  const s = await prisma.setting.findUnique({ where: { key: CURSOR_KEY } });
  if (!s) return 0;
  const n = Number(s.value);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

/**
 * 更新游标为给定 UID。只应在成功处理后调用。
 */
export async function setCursor(uid: number): Promise<void> {
  await prisma.setting.upsert({
    where: { key: CURSOR_KEY },
    create: { key: CURSOR_KEY, value: String(uid) },
    update: { value: String(uid) },
  });
}

/**
 * 连接 IMAP，拉取发件人为招行、标题含「每日信用管家」、UID 大于 sinceUid 的新邮件。
 * 返回按 UID 升序排列的邮件（含解析后的 text/html）。
 */
export async function fetchNewEmails(
  config: ImapConfig,
  sinceUid: number,
  subject: string,
): Promise<FetchedEmail[]> {
  const client = new ImapFlow({
    host: config.host,
    port: config.port,
    secure: true,
    auth: { user: config.user, pass: config.pass },
    logger: false,
  });

  const emails: FetchedEmail[] = [];

  try {
    await client.connect();
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new Error(`IMAP 连接失败: ${msg}`);
  }

  const lock = await client.getMailboxLock("INBOX");
  try {
    // UID 搜索范围：sinceUid+1 到末尾。sinceUid=0 时搜全部。
    const uidRange = `${sinceUid + 1}:*`;
    const uids = await client.search({ uid: uidRange, subject }, { uid: true });

    if (!uids || uids.length === 0) return [];

    // UID 搜索的 "N:*" 语义会至少返回最后一封，需再过滤掉 <= sinceUid 的。
    const freshUids = uids.filter((u) => u > sinceUid).sort((a, b) => a - b);
    if (freshUids.length === 0) return [];

    for await (const msg of client.fetch(
      freshUids,
      { uid: true, source: true, envelope: true },
      { uid: true },
    )) {
      if (!msg.source) continue;
      const parsed = await simpleParser(msg.source);
      emails.push({
        uid: msg.uid,
        subject: parsed.subject ?? msg.envelope?.subject ?? "",
        date: parsed.date ?? undefined,
        text: parsed.text ?? undefined,
        html: typeof parsed.html === "string" ? parsed.html : undefined,
      });
    }
  } finally {
    lock.release();
    await client.logout().catch(() => {});
  }

  return emails.sort((a, b) => a.uid - b.uid);
}
