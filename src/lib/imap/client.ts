import { ImapFlow } from "imapflow";
import { simpleParser } from "mailparser";

// 招行邮件经 live.cn 转发到 QQ 后，发件人变为转发者，不能再按 FROM 过滤。
// 主题里的「每日信用管家」在转发后仍保留（IMAP subject 为「包含」匹配，
// 即使带 "Fwd:"/"转发：" 前缀也能命中），故只按主题过滤。
// 多卡架构下每张卡独立配置 subject，由调用方传入。

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
