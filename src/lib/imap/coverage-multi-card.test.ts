import { describe, it, expect } from "vitest";
import {
  getCoverageKey,
  normalizeCoverageDate,
  parseCoveredDates,
  addCoveredDate,
  computeWindowCoverage,
} from "./coverage";

describe("getCoverageKey", () => {
  it("返回卡级键当 cardId 存在", () => {
    expect(getCoverageKey("card-123")).toBe("daily_covered_dates_card-123");
  });

  it("返回全局键当 cardId 为 null", () => {
    expect(getCoverageKey(null)).toBe("daily_covered_dates");
  });

  it("返回全局键当 cardId 为 undefined", () => {
    expect(getCoverageKey(undefined)).toBe("daily_covered_dates");
  });
});

describe("normalizeCoverageDate", () => {
  it("从 Date 对象提取 YYYY-MM-DD", () => {
    const date = new Date("2026-08-11T15:30:00Z");
    const result = normalizeCoverageDate(date);
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("从 ISO 字符串提取 YYYY-MM-DD", () => {
    expect(normalizeCoverageDate("2026-08-11T15:30:00Z")).toBe("2026-08-11");
  });
});

describe("parseCoveredDates", () => {
  it("解析有效 JSON 数组", () => {
    const result = parseCoveredDates('["2026-08-07","2026-08-08"]');
    expect(result).toEqual(["2026-08-07", "2026-08-08"]);
  });

  it("无效 JSON 返回空数组", () => {
    expect(parseCoveredDates("invalid")).toEqual([]);
  });

  it("null 返回空数组", () => {
    expect(parseCoveredDates(null)).toEqual([]);
  });
});

describe("addCoveredDate", () => {
  it("添加新日期并排序", () => {
    const existing = ["2026-08-07"];
    const result = addCoveredDate(existing, "2026-08-09");
    expect(result).toEqual(["2026-08-07", "2026-08-09"]);
  });

  it("去重已存在日期", () => {
    const existing = ["2026-08-07", "2026-08-09"];
    const result = addCoveredDate(existing, "2026-08-07");
    expect(result).toBe(existing); // 返回原引用
  });

  it("保持排序", () => {
    const existing = ["2026-08-07", "2026-08-09"];
    const result = addCoveredDate(existing, "2026-08-08");
    expect(result).toEqual(["2026-08-07", "2026-08-08", "2026-08-09"]);
  });
});

describe("computeWindowCoverage", () => {
  it("生成窗口覆盖度（倒序）", () => {
    const covered = ["2026-08-07", "2026-08-09"];
    const result = computeWindowCoverage(covered, "2026-08-07", "2026-08-10");
    expect(result).toEqual([
      { date: "2026-08-10", covered: false },
      { date: "2026-08-09", covered: true },
      { date: "2026-08-08", covered: false },
      { date: "2026-08-07", covered: true },
    ]);
  });

  it("单日窗口", () => {
    const covered = ["2026-08-07"];
    const result = computeWindowCoverage(covered, "2026-08-07", "2026-08-07");
    expect(result).toEqual([{ date: "2026-08-07", covered: true }]);
  });
});
