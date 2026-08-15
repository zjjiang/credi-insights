# Implementation Tasks: restore-card-report-panel

## 1. 后端接口

- [ ] 1.1 编写 `src/app/api/cards/[id]/uploads/route.test.ts`：验证按账期倒序、按卡片过滤、卡片不存在时 404
- [ ] 1.2 实现 `GET /api/cards/[id]/uploads`，测试转绿

## 2. 未分类/大额面板组件

- [ ] 2.1 新增 `src/components/cards/UploadPeriodPanel.tsx`，从 `UploadBatchCard.tsx` 迁移交易加载、未分类商户分组、批量分类、Top10 大额逻辑
- [ ] 2.2 Tab 结构简化为「明细 / 未分类 (N) / 大额」（不迁移原 stats tab）

## 3. 卡片详情页接入

- [ ] 3.1 `src/app/cards/[id]/page.tsx` 拉取该卡账单列表，新增账单周期选择区块
- [ ] 3.2 迁移 `handleDownloadReport`、`handleReclassify` 到详情页，作用于选中账单
- [ ] 3.3 无账单时账单周期区块不渲染
- [ ] 3.4 挂载 `UploadPeriodPanel`，传入选中的 `uploadId`

## 4. 验证

- [ ] 4.1 `npm run test` 全部通过
- [ ] 4.2 `npm run build` 类型检查通过
- [ ] 4.3 手动验证：切换账单周期、下载报告、重新分类、未分类分类、大额编辑
