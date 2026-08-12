import { prisma } from "@/lib/db";

/**
 * 日推覆盖度：记录哪些自然日已被「每日信用管家」日推邮件覆盖。
 *
 * 用于判断日结完整性 —— 缺口日 = 窗口内不在已覆盖集合中的日期。
 * 存储于 Setting 表，每张卡独立键 `daily_covered_dates_{cardId}`，
 * 值为排序的 JSON 日期数组（如 `["2026-08-07","2026-08-08"]`）。
 *
 * 全局键 `daily_covered_dates`（无后缀）仍保留用于向后兼容，
 * 读取时优先使用卡级键。见 design.md D9。
 */
export const COVERAGE_KEY_PREFIX = "daily_covered_dates";

/**
 * 构建卡级覆盖度键名。若 cardId 为 null/undefined，返回全局键（向后兼容）。
 */
export function getCoverageKey(cardId?: string | null): string {
  return cardId ? `${COVERAGE_KEY_PREFIX}_${cardId}` : COVERAGE_KEY_PREFIX;
}

export interface DayCoverage {
  date: string; // YYYY-MM-DD
  covered: boolean;
}

/**
 * 归一化为 YYYY-MM-DD。字符串取前 10 位；Date 用本地日期分量避免 UTC 跨天。
 */
export function normalizeCoverageDate(d: Date | string): string {
  if (typeof d === "string") return d.slice(0, 10);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/**
 * 解析 Setting 值为日期数组。null/空/非法 JSON 一律返回空数组（fail-safe）。
 */
export function parseCoveredDates(value: string | null): string[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((x): x is string => typeof x === "string");
  } catch {
    return [];
  }
}

/**
 * 返回加入新日期后的新数组（不可变，去重，升序）。原数组不变。
 */
export function addCoveredDate(
  existing: string[],
  date: Date | string,
): string[] {
  const normalized = normalizeCoverageDate(date);
  if (existing.includes(normalized)) return existing;
  return [...existing, normalized].sort();
}

/**
 * 计算窗口内每一天的覆盖状态，按日期倒序（最近在前）。
 * start/end 均为 YYYY-MM-DD，闭区间。
 */
export function computeWindowCoverage(
  covered: string[],
  start: string,
  end: string,
): DayCoverage[] {
  const coveredSet = new Set(covered);
  const result: DayCoverage[] = [];
  const cursor = new Date(`${start}T00:00:00`);
  const last = new Date(`${end}T00:00:00`);
  while (cursor <= last) {
    const date = normalizeCoverageDate(cursor);
    result.push({ date, covered: coveredSet.has(date) });
    cursor.setDate(cursor.getDate() + 1);
  }
  return result.reverse();
}

/**
 * 从 Setting 读取已覆盖日期集合（支持卡级键）。
 */
export async function getCoveredDates(
  cardId?: string | null,
): Promise<string[]> {
  const key = getCoverageKey(cardId);
  const s = await prisma.setting.findUnique({ where: { key } });
  return parseCoveredDates(s?.value ?? null);
}

/**
 * 将某自然日记为已覆盖（幂等，支持卡级键）。基于邮件收到，与当日是否有交易无关。
 */
export async function markDateCovered(
  date: Date | string,
  cardId?: string | null,
): Promise<void> {
  const existing = await getCoveredDates(cardId);
  const updated = addCoveredDate(existing, date);
  if (updated === existing) return; // 已存在，无需写
  const key = getCoverageKey(cardId);
  const value = JSON.stringify(updated);
  await prisma.setting.upsert({
    where: { key },
    create: { key, value },
    update: { value },
  });
}
