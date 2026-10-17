/**
 * Recharts 图表统一配色：取 antd 默认色板（seed #1677ff 系）前 8 色。
 * 所有图表填充色一律从 CHART_COLORS 取，禁止在组件内散落硬编码色值。
 */
export const CHART_COLORS = [
  "#1677ff",
  "#2cdbca",
  "#722ed1",
  "#f5222d",
  "#faad14",
  "#13c2c2",
  "#eb2f96",
  "#52c41a",
] as const;

/** 支出（负向）系列色，取自 CHART_COLORS[3] */
export const CHART_NEGATIVE: string = CHART_COLORS[3];

/** 收入（正向）系列色，取自 CHART_COLORS[7] */
export const CHART_POSITIVE: string = CHART_COLORS[7];
