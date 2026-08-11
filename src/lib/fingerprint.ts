/**
 * 交易去重指纹：`${date}_${cardLast4}_${amount}`
 *
 * 日推送与月账单跨源去重的唯一依据。选用 日期+卡号+金额 而非商户名，
 * 因为两个来源的商户名截断方式不同（如 "支付宝-东吴面馆" vs "东吴面馆"），
 * 无法稳定匹配。同日同卡同额碰撞概率极低（金额精确到分）。
 *
 * 金额统一格式化为两位小数字符串，确保 28 与 28.00 生成同一指纹。
 */
export function makeFingerprint(params: {
  txDate: Date | string
  cardLast4?: string | null
  amount: number | string
}): string {
  const date = toDateOnly(params.txDate)
  const card = params.cardLast4 ?? 'NA'
  const amount = Number(params.amount).toFixed(2)
  return `${date}_${card}_${amount}`
}

function toDateOnly(d: Date | string): string {
  if (typeof d === 'string') {
    // "2026-07-25" 或 "2026-07-25T..." → "2026-07-25"
    return d.slice(0, 10)
  }
  // 用本地日期分量，避免 UTC 偏移导致跨天
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}
