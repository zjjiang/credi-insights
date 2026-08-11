/**
 * 解析招行「每日信用管家」邮件正文，提取逐笔消费明细。
 *
 * 邮件结构示例：
 *   2026/07/25 您的消费明细如下：
 *   10:26:03
 *   CNY 28.00
 *   尾号0094 消费 支付宝-东吴面馆
 *   14:03:35
 *   CNY 50.00
 *   尾号0094 消费 支付宝-林屋洞
 *   ...
 *
 * 每笔交易由三行构成：时间、金额、详情（尾号/类型/商户）。
 */

export interface DailyTransaction {
  txDate: string; // "2026-07-25"
  txTime: string; // "10:26:03"
  merchant: string;
  amount: number;
  currency: string;
  type: "DEBIT" | "CREDIT";
  cardLast4?: string;
}

export interface DailyParseResult {
  transactions: DailyTransaction[];
  rawText: string;
}

const DATE_HEADER_RE = /(\d{4})\/(\d{2})\/(\d{2})\s*您的消费明细如下/;
const TIME_RE = /^(\d{2}):(\d{2}):(\d{2})$/;
const AMOUNT_RE = /^CNY\s+([\d,]+\.?\d*)$/;
const DETAIL_RE = /^尾号(\d{4})\s+(消费|退款)\s+(.+)$/;

const TYPE_MAP: Record<string, "DEBIT" | "CREDIT"> = {
  消费: "DEBIT",
  退款: "CREDIT",
};

/**
 * 从 HTML 中提取可见文本行（去标签、去空行、去脚本/样式）。
 */
export function extractLines(html: string): string[] {
  const withoutBlocks = html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "");
  const withBreaks = withoutBlocks
    .replace(/<\/(p|div|tr|td|br|li|h[1-6])>/gi, "\n")
    .replace(/<br\s*\/?>/gi, "\n");
  const text = withBreaks.replace(/<[^>]+>/g, "");
  return decodeEntities(text)
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length > 0);
}

function decodeEntities(s: string): string {
  return s
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code) =>
      String.fromCharCode(parseInt(code, 16)),
    );
}

/**
 * 从纯文本行数组解析交易。日期头之后的交易归属该日期，
 * 遇到新日期头则切换。
 */
export function parseLines(lines: string[]): DailyTransaction[] {
  const transactions: DailyTransaction[] = [];
  let currentDate: string | null = null;
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    const dateMatch = line.match(DATE_HEADER_RE);
    if (dateMatch) {
      currentDate = `${dateMatch[1]}-${dateMatch[2]}-${dateMatch[3]}`;
      i += 1;
      continue;
    }

    const timeMatch = line.match(TIME_RE);
    if (currentDate && timeMatch) {
      const tx = tryParseBlock(lines, i, currentDate);
      if (tx) {
        transactions.push(tx.transaction);
        i = tx.nextIndex;
        continue;
      }
    }

    i += 1;
  }

  return transactions;
}

// 时间行之后、下一笔交易之前，最多向前扫描多少行去找金额/详情。
// 转发邮件会在时间与金额之间插入图片 URL 等噪声行，故不能假设紧邻。
const LOOKAHEAD = 6;

/**
 * 从 time 行开始尝试解析一笔交易。时间、金额、详情三者之间可能夹杂
 * 噪声行（图片 URL、空行等，尤其经邮件转发后），故按「向前查找最近的
 * 金额行、再查找最近的详情行」推进，而非假设三行紧邻。
 */
function tryParseBlock(
  lines: string[],
  startIndex: number,
  date: string,
): { transaction: DailyTransaction; nextIndex: number } | null {
  const timeMatch = lines[startIndex].match(TIME_RE);
  if (!timeMatch) return null;
  const txTime = `${timeMatch[1]}:${timeMatch[2]}:${timeMatch[3]}`;

  // 向前找金额行（遇到下一个时间行则中止，说明本行不是真正的交易起点）
  const amountIndex = findLine(lines, startIndex + 1, AMOUNT_RE);
  if (amountIndex === -1) return null;
  const amountMatch = lines[amountIndex].match(AMOUNT_RE)!;
  const amount = Number(amountMatch[1].replace(/,/g, ""));
  if (!Number.isFinite(amount)) return null;

  // 从金额行之后向前找详情行
  const detailIndex = findLine(lines, amountIndex + 1, DETAIL_RE);
  if (detailIndex === -1) return null;
  const detailMatch = lines[detailIndex].match(DETAIL_RE)!;

  const cardLast4 = detailMatch[1];
  const type = TYPE_MAP[detailMatch[2]] ?? "DEBIT";
  const merchant = detailMatch[3].trim();

  return {
    transaction: {
      txDate: date,
      txTime,
      merchant,
      amount,
      currency: "CNY",
      type,
      cardLast4,
    },
    nextIndex: detailIndex + 1,
  };
}

/**
 * 从 from 起在 LOOKAHEAD 范围内查找匹配 re 的行索引。
 * 中途遇到时间行（下一笔交易的起点）则放弃，返回 -1，避免跨笔误匹配。
 */
function findLine(lines: string[], from: number, re: RegExp): number {
  const end = Math.min(lines.length, from + LOOKAHEAD);
  for (let i = from; i < end; i++) {
    if (TIME_RE.test(lines[i])) return -1;
    if (re.test(lines[i])) return i;
  }
  return -1;
}

/**
 * 解析一封日汇总邮件。优先用纯文本，无则从 HTML 提取。
 */
export function parseDailyEmail(input: {
  text?: string;
  html?: string;
}): DailyParseResult {
  let lines: string[];
  if (input.text && input.text.trim().length > 0) {
    lines = input.text
      .split("\n")
      .map((l) => l.trim())
      .filter((l) => l.length > 0);
  } else if (input.html) {
    lines = extractLines(input.html);
  } else {
    lines = [];
  }

  return {
    transactions: parseLines(lines),
    rawText: lines.join("\n"),
  };
}
