import { ImapFlow, type SearchObject } from "imapflow";
import { simpleParser } from "mailparser";
import type { ImapConfig, FetchedEmail } from "./client";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * 构造按日期范围搜索日推邮件的 IMAP 查询条件。
 *
 * IMAP 的 `before` 是排它的（不含当天），故闭区间 [start, end] 的 before
 * 取 end 的次日零点。start/end 均为 YYYY-MM-DD。
 */
export function buildDateRangeSearch(
  start: string,
  end: string,
  subject: string,
): SearchObject {
  if (!DATE_RE.test(start) || !DATE_RE.test(end)) {
    throw new Error(`日期格式无效，应为 YYYY-MM-DD: start=${start} end=${end}`);
  }
  const since = new Date(`${start}T00:00:00`);
  const endDate = new Date(`${end}T00:00:00`);
  if (since > endDate) {
    throw new Error(`起始日期晚于结束日期: ${start} > ${end}`);
  }
  const before = new Date(endDate);
  before.setDate(before.getDate() + 1);
  return { subject, since, before };
}

/**
 * 按日期范围重新拉取日推邮件（用于补齐缺口），不依赖 UID 游标。
 * 返回按 UID 升序排列的邮件。
 */
export async function fetchEmailsByDateRange(
  config: ImapConfig,
  start: string,
  end: string,
  subject: string,
): Promise<FetchedEmail[]> {
  const search = buildDateRangeSearch(start, end, subject);

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
    const uids = await client.search(search, { uid: true });
    if (!uids || uids.length === 0) return [];

    for await (const msg of client.fetch(
      uids,
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
