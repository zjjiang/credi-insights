# Implementation Tasks: split-active-history-tabs

## 1. 后端：活跃流水日期下限过滤

- [ ] 1.1 编写 `src/app/api/cards/[id]/transactions/route.test.ts`：验证 `since` 排除早于该日期且已关联账单的交易；`uploadId` 为空的交易不受 `since` 影响始终返回；不传 `since` 时行为与现状一致
- [ ] 1.2 实现 `since` 参数 + OR 兜底查询，测试转绿

## 2. 前端：DailyView 支持 since

- [ ] 2.1 `src/components/daily/DailyView.tsx` 新增 `since?: string` prop，拼入请求 URL

## 3. 卡片详情页 Tab 拆分

- [ ] 3.1 计算 cutoffDate（该卡 DONE 且 billingEnd 非空账单中的最大值）
- [ ] 3.2 新增 Tab 切换 UI（活跃流水 / 历史账单），默认选中活跃流水
- [ ] 3.3 活跃流水 Tab：「同步日推」按钮 + `DailyView` 传入 `since={cutoffDate}`
- [ ] 3.4 历史账单 Tab：「上传月账单」按钮 + 现有账单周期面板迁入
- [ ] 3.5 同步/上传结果提示条跟随各自 Tab 内的操作显示

## 4. 验证

- [ ] 4.1 `npm run test` 全部通过
- [ ] 4.2 `npm run build` 类型检查通过
- [ ] 4.3 手动验证：活跃流水只显示最新账期之后的交易，历史账单能查到已出账单周期的明细，孤儿交易在活跃流水可见
