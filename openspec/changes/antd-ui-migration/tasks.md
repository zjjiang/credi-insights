# Tasks

## 1. 地基

- [x] 1.1 创建分支 `feat/antd-ui-migration`，安装 `antd`、`@ant-design/icons`、`@ant-design/nextjs-registry`
- [x] 1.2 新建 `src/components/providers/AntdProviders.tsx`（ConfigProvider + App + zh_CN + 主题令牌 + dark 接线），挂入 `src/app/layout.tsx`（含 AntdRegistry）
- [x] 1.3 重写 `src/app/globals.css`：移除 shadcn 变量体系与 `shadcn/tailwind.css`、`tw-animate-css` 引用，保留 Tailwind preflight 与布局工具类
- [x] 1.4 TopNav 迁移为 antd Menu（保持 app-navigation spec 行为），验证 `tsc`

## 2. 组件层迁移

- [x] 2.1 迁移 `src/components/upload/MsgDropzone.tsx` 与 `src/components/history/UploadBatchCard.tsx`
- [x] 2.2 迁移 `src/components/transactions/TransactionList.tsx`、`TransactionRow.tsx`
- [x] 2.3 迁移 `src/components/daily/DailyView.tsx`、`DayCard.tsx`
- [x] 2.4 迁移 `src/components/dashboard/*`（含新建 `src/lib/chart-colors.ts` 统一 Recharts 配色）
- [x] 2.5 迁移 `src/components/cards/UploadPeriodPanel.tsx` 与 `src/components/ai/*`（AiSidebar/AiToggleButton 换肤）

## 3. 页面层迁移

- [x] 3.1 首页 `src/app/page.tsx`
- [x] 3.2 设置页 `src/app/settings/page.tsx`
- [x] 3.3 卡片页：`cards/[id]/page.tsx`、`cards/[id]/settings/page.tsx`、`cards/new/page.tsx`
- [x] 3.4 `uploads/[uploadId]/page.tsx` 与 `admin/transactions`（Table + scroll.x）
- [x] 3.5 删除 `src/components/ui/`，全局 grep 确认无残留引用

## 4. 验证

- [x] 4.1 `tsc --noEmit`、`npm run lint`、`npm test`（55 用例）全绿
- [x] 4.2 `npm run build` 成功，dev 起服后逐页目检（亮色/375px/表格滚动/反馈消息）
- [x] 4.3 提交、推送并创建 PR
