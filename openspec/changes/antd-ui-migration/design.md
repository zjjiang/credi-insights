# Design

## Context

现状：shadcn/ui 提供 8 个基础组件（button/card/dialog/input/label/select/textarea/badge），仅 8 个文件引用；其余 UI 为手拼 Tailwind 类。`globals.css` 采用 shadcn CSS 变量体系（`@theme inline` + `.dark`），无主题切换器（`.dark` 为预留）。页面共 9 个 tsx（layout + 8 页面/子组件页），业务组件 14 个。测试 55 个用例集中在 API/lib 层。

## Goals / Non-Goals

**Goals**
- antd 6 成为唯一组件体系，shadcn 组件删除
- 阿里云控制台观感：#1677ff 主色、紧凑密度、统一页头/卡片/表格/表单
- SSR 无样式闪烁；移动端不回退；现有 55 测试不失败

**Non-Goals**
- 不做主题切换 UI（仅保留 `.dark` → darkAlgorithm 的接线）
- 不改任何 API、数据模型、业务逻辑
- 不替换 Recharts（仅统一配色令牌）
- 不重写 AiSidebar 内部交互（仅换肤）

## Decisions

1. **SSR 样式方案：`@ant-design/nextjs-registry`**
   App Router 下 antd 的 cssinjs 样式需服务端提取，否则首屏闪烁。`layout.tsx` 中用 `<AntdRegistry>` 包裹。备选（手动 StyleProvider/extractStaticStyle）维护成本更高，弃。

2. **ConfigProvider 放在客户端 Providers 组件**
   新建 `src/components/providers/AntdProviders.tsx`（`"use client"`）：`ConfigProvider`（theme tokens + `zh_CN`）内嵌 antd `App` 组件（为 `App.useApp()` 提供 message/modal 上下文，避免静态方法在 SSR 下的警告）。根 layout（server）引入它。

3. **主题令牌**
   ```ts
   theme: { token: { colorPrimary: '#1677ff', borderRadius: 6, fontSize: 14 } }
   ```
   检测 `document.documentElement.classList.contains('.dark')` 时切换 `theme.darkAlgorithm`（无切换 UI，仅接线）。字体沿用 Geist：`fontFamily` token 继承 body。

4. **Tailwind v4 与 antd 共存**
   保留 Tailwind 作布局工具类（flex/间距/栅格）；`globals.css` 删除 `@import "shadcn/tailwind.css"`、`tw-animate-css` 与整段 shadcn 变量体系，保留 preflight。antd 类选择器（`.ant-*`）特异性高于 preflight 元素选择器，实践无冲突；构建后人工核验按钮/输入框底色。

5. **组件映射**（shadcn → antd）
   | shadcn | antd |
   |---|---|
   | Button | Button |
   | Card | Card |
   | Dialog | Modal |
   | Input / Textarea | Input / Input.TextArea |
   | Label | Form.Item label / Typography.Text |
   | Select | Select |
   | Badge | Tag / Badge |
   | 反馈 | App.useApp().message / modal.confirm |

6. **表格页（admin/transactions）用 antd Table**
   `scroll={{ x: true }}` + 受控分页，移动端容器内滚动（对应 spec 场景）。交易列表（TransactionList/Row）为移动端卡片式列表，保留布局结构，换 antd Tag/Button/反馈。

7. **图表配色**：Recharts 系列色统一取 antd 默认色板前 5 色（#1677ff/#2adbca…以 token 为准），集中在 `src/lib/chart-colors.ts` 导出。

8. **导航**：TopNav 改 antd `Menu`（horizontal，`selectedKeys` 由 pathname 推导），保持「顶部、文档流、底部分隔线、两项、路由高亮」——与 `app-navigation` spec 完全一致。

## Risks / Trade-offs

- [Tailwind preflight 干扰 antd 底色] → 构建后逐页目检；必要时对 `button` 元素加一层 reset 豁免
- [antd 体积增大首屏] → 全量引入按 antd 6 tree-shaking（ESM）天然分包；不引 babel-plugin-import（已废弃做法）
- [App Router 下 useApp 上下文层级] → Providers 置于 `AiProvider` 之内、`TopNav` 之前，保证全树可用
- [55 个测试中 UI 快照类失败] → 现有测试集中于 API/lib；如遇组件选择器断言同步更新

## Migration Plan

1. 分支 `feat/antd-ui-migration`，装依赖
2. 地基：AntdProviders + globals.css 重写 + TopNav
3. 逐页迁移（自底向上：ui 引用方 → 业务组件 → 页面），每页完成即 `tsc --noEmit`
4. 删除 `src/components/ui/`
5. `lint + tsc + vitest + build` 全绿 → PR

回滚：PR 不合并即回滚；合后回滚 = revert 单个 merge commit（无数据/schema 变更）。

## Open Questions

无。
