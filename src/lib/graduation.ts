/**
 * 判断一笔被月账单对账的已有交易是否「从日推毕业」。
 *
 * 仅当已有记录来源为 "daily"（先由日推入库）时为 true —— 此后它被月账单
 * 覆盖为 "bill"，但曾带用户在日推 Tab 打的标签，故 UI 需高亮。见 design.md D6。
 */
export function didGraduateFromDaily(existingSource: string | null | undefined): boolean {
  return existingSource === "daily";
}
