import type { OcrResult, OcrTransaction } from './types'

// Matches: ¥1,234.56  or  -¥1,234.56  or  +¥1,234.56
const AMOUNT_PATTERN = /([+-]?)¥([\d,]+\.?\d*)/
// Matches card digits: "信用卡0094" or "尾号0094" or "卡号0094" or "(\d{4})"
const CARD_PATTERN = /(?:信用卡|尾号|卡号|末四位|后四位)(\d{4})|（(\d{4})）/
// Date label in list headers: "4月5日", "04月05日", "今天", "昨天"
const DATE_LABEL_PATTERN = /^(\d{1,2})月(\d{1,2})日$/
// Full date in line: "2026-04-05" or "2026/04/05" or "04-05" or "04/05"
const FULL_DATE_PATTERN = /(?:(\d{4})[/-])?(\d{1,2})[/-](\d{1,2})/
// HH:MM time
const TIME_PATTERN = /\b(\d{2}):(\d{2})\b/
// Status keywords
const TX_STATUS_PATTERN = /未入账|已入账|待入账|处理中/
// Amount-only line (just a number, no merchant prefix) — skip these
const AMOUNT_ONLY_LINE = /^[+-]?¥[\d,]+\.?\d*$/
// Lines that are clearly UI chrome, not transactions
const SKIP_LINE_PATTERN =
  /^(账单|账户|信用|还款|可用|已用|本期|上期|最低|应还|累计|共\d|合计|小计|总计|筛选|搜索|全部|收入|支出|明细|记录|详情|设置|首页|我的|发现|更多|¥$|^¥[\d,]+$)/

function parseYear(imageMonth?: string): number {
  if (imageMonth) return parseInt(imageMonth.split('-')[0], 10)
  return new Date().getFullYear()
}

function parseMonth(imageMonth?: string): number {
  if (imageMonth) return parseInt(imageMonth.split('-')[1], 10)
  return new Date().getMonth() + 1
}

function resolveDate(
  label: string,
  lineDate: { month?: number; day?: number } | null,
  imageMonth: string | undefined,
  time: string,
): Date {
  const year = parseYear(imageMonth)
  const month = parseMonth(imageMonth)
  const [hours, minutes] = time.split(':').map(Number)
  const today = new Date()

  if (label === '今天') {
    return new Date(year, month - 1, today.getDate(), hours, minutes)
  }
  if (label === '昨天') {
    return new Date(year, month - 1, today.getDate() - 1, hours, minutes)
  }

  const m = label.match(DATE_LABEL_PATTERN)
  if (m) {
    return new Date(year, parseInt(m[1], 10) - 1, parseInt(m[2], 10), hours, minutes)
  }

  if (lineDate?.month && lineDate?.day) {
    return new Date(year, lineDate.month - 1, lineDate.day, hours, minutes)
  }

  return new Date(year, month - 1, 1, hours, minutes)
}

function extractMerchant(line: string): string {
  // Remove amount, time, status keywords, leading/trailing noise
  let s = line
    .replace(AMOUNT_PATTERN, '')
    .replace(TIME_PATTERN, '')
    .replace(TX_STATUS_PATTERN, '')
    .replace(/[\u200b-\u200f\ufeff]/g, '') // zero-width chars
    .replace(/^\s*[-·•]\s*/, '')
    .trim()

  // Remove trailing separators
  s = s.replace(/[|｜·•\-–—]+$/, '').trim()
  return s || '未知商家'
}

function parseTransactions(
  lines: string[],
  imageMonth: string | undefined,
): OcrTransaction[] {
  const transactions: OcrTransaction[] = []
  let currentDateLabel = ''
  let currentCard: string | undefined

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim()
    if (!line) continue

    // Skip pure UI / header lines
    if (SKIP_LINE_PATTERN.test(line)) continue

    // Extract card number if present on this line
    const cardMatch = line.match(CARD_PATTERN)
    if (cardMatch) {
      currentCard = cardMatch[1] ?? cardMatch[2]
    }

    // Date section headers
    if (line === '今天' || line === '昨天' || DATE_LABEL_PATTERN.test(line)) {
      currentDateLabel = line
      continue
    }

    // Skip amount-only lines (totals/separators)
    if (AMOUNT_ONLY_LINE.test(line)) continue

    const amountMatch = line.match(AMOUNT_PATTERN)
    if (!amountMatch) continue

    const sign = amountMatch[1]
    const rawAmount = parseFloat(amountMatch[2].replace(/,/g, ''))
    if (isNaN(rawAmount) || rawAmount === 0) continue

    // Determine debit/credit:
    // Explicit +/- sign takes priority; otherwise check for "收入" on line or next line
    let type: 'DEBIT' | 'CREDIT'
    if (sign === '+') {
      type = 'CREDIT'
    } else if (sign === '-') {
      type = 'DEBIT'
    } else {
      // Heuristic: look for 收入 / 退款 / 还款 nearby
      const context = [line, lines[i + 1] ?? ''].join(' ')
      type = /收入|退款|还款|转入|红包|返现/.test(context) ? 'CREDIT' : 'DEBIT'
    }

    // Try to find a time on this line; fall back to 00:00
    const timeMatch = line.match(TIME_PATTERN)
    const time = timeMatch ? `${timeMatch[1]}:${timeMatch[2]}` : '00:00'

    // Try to find an inline date (e.g. "04-05" or "4/5")
    let inlineDate: { month?: number; day?: number } | null = null
    const fullDateMatch = line.match(FULL_DATE_PATTERN)
    if (fullDateMatch && !DATE_LABEL_PATTERN.test(line)) {
      inlineDate = {
        month: parseInt(fullDateMatch[2], 10),
        day: parseInt(fullDateMatch[3], 10),
      }
    }

    const txStatusMatch = line.match(TX_STATUS_PATTERN)
    const txStatus = txStatusMatch ? txStatusMatch[0] : undefined

    const merchant = extractMerchant(line)

    // Skip lines that resolve to empty or look like column headers
    if (merchant.length < 1) continue

    const txDate = resolveDate(currentDateLabel, inlineDate, imageMonth, time)

    transactions.push({
      merchant,
      amount: rawAmount,
      type,
      txDate,
      cardLast4: currentCard,
      txStatus,
      currency: 'CNY',
    })
  }

  return transactions
}

export function parseOcrResult(rawText: string, imageMonth?: string): OcrResult {
  const lines = rawText.split('\n')

  // Extract card last4 from full text
  const cardMatch = rawText.match(CARD_PATTERN)
  const cardLast4 = cardMatch ? (cardMatch[1] ?? cardMatch[2]) : undefined

  // Extract imageMonth from text if not passed in
  if (!imageMonth) {
    const monthMatch = rawText.match(/(\d{4})[年/-](\d{1,2})月?/)
    if (monthMatch) {
      imageMonth = `${monthMatch[1]}-${String(monthMatch[2]).padStart(2, '0')}`
    }
  }

  const transactions = parseTransactions(lines, imageMonth)

  return {
    imageMonth,
    cardLast4,
    transactions,
    rawText,
  }
}
