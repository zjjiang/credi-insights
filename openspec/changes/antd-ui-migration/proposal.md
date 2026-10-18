# Proposal

## Why

现有 UI 由 shadcn/ui（仅 9 个基础组件）与手拼 Tailwind 类名构成，各页面视觉不一致、缺乏统一设计语言，维护成本随页面数量增长。用户明确要求对齐阿里云控制台的成熟视觉语言，采用 Ant Design 组件库统一全站交互与观感，同时借助 antd 成熟的企业级组件（Table/Form/Layout）降低后续页面的搭建成本。

## What Changes

- 引入 `antd@6.x`、`@ant-design/icons`、`@ant-design/nextjs-registry`（App Router SSR 样式提取，防闪烁）
- 通过 `ConfigProvider` 建立全局主题：主色阿里云蓝 `#1677ff`、`zh_CN` 国际化、紧凑控件密度，与现有品牌调性对齐
- **BREAKING**（仅组件层，非数据/API）：删除 `src/components/ui/` 下全部 shadcn 组件（badge/button/card/dialog/input/label/select/textarea），调用方替换为 antd 等价组件（Badge/Button/Card/Modal/Input/Form/Select 等）
- 全站页面视觉重构为阿里云控制台风格：统一的页头（PageHeader）、卡片容器、表格（Table）、表单（Form）、反馈组件（message/notification）——覆盖 `/`（上传+历史）、`/cards/[id]`、`/settings`、`/admin/transactions` 及 dashboard/history/stats/analysis/categories 等页面
- 全局导航沿用现有顶部持久导航结构（遵循 `app-navigation` spec：首页/设置两项、当前路由高亮），实现改用 antd `Menu`，视觉对齐阿里云控制台顶栏
- 保留暗色模式支持：通过 antd `theme.darkAlgorithm` 映射现有 `.dark` 类切换
- 保留 Tailwind v4 作为布局工具类（间距/栅格）与 antd 共存；重写 `globals.css` 移除 shadcn CSS 变量体系，并处理与 antd 的 preflight/样式优先级冲突
- 移动端体验不回退：延续现有移动优先的响应式行为（antd 栅格 + 响应式断点）

## Capabilities

### New Capabilities

- `ui-design-system`: 全站统一设计系统能力——antd 主题令牌（主色、密度、圆角）、zh_CN 本地化、亮/暗双主题、组件选型规范（按钮/表格/表单/反馈），以及移动端可用性底线。作为后续所有页面 UI 的唯一权威依据。

### Modified Capabilities

（无——本次为视觉与实现层替换，现有 spec 的行为要求——顶部导航结构、日推送独立 Tab、卡片活跃/历史 Tab 拆分、上传关联流程等——全部保持不变，不涉及需求级变更。）

## Impact

- **依赖**：新增 `antd`、`@ant-design/icons`、`@ant-design/nextjs-registry`；移除 shadcn 相关依赖（`class-variance-authority`、`clsx`/`tailwind-merge` 视残留引用决定）
- **代码**：`src/app/layout.tsx`（挂 ConfigProvider + AntdRegistry）、`src/app/globals.css`（重写）、`src/components/ui/*`（删除）、`src/app/**/page.tsx` 及 `src/components/**`（全部触达）
- **测试**：现有 55 个测试以 API/lib 层为主，预期不因 UI 替换失败；页面级交互若有测试需同步更新选择器
- **风险**：
  - App Router SSR 样式闪烁 → 用 `@ant-design/nextjs-registry` 规避
  - Tailwind preflight 与 antd 样式互相覆盖 → 在 design 阶段明确禁用范围与优先级策略
  - Recharts 图表配色需与 antd 主题令牌统一（design 阶段定义映射）
