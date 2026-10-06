# Proposal: 修复 AI 分类在 GLM 推理模型下静默失败

## Why

用户使用智谱 GLM Coding Plan key + `glm-5.3` 模型跑「重新分类」，225 笔交易只分类成功 2 笔。根因已实锤复现：`glm-5.3` 是推理模型，思考内容与正文共享 `max_tokens` 预算——实测 1024 tokens 中 1002 个被思考消耗，`content` 为空、`finish_reason: length`，导致 `ai-classify.ts` 的 JSON 提取失败、该批次静默返回 0 条结果。接口层面表现为 `200 {classified: N}`，无任何报错，问题被完全掩盖。

## What Changes

- `src/lib/ai-classify.ts`：请求 GLM 系模型（`glm-*`）时传 `thinking: { type: "disabled" }` 关闭思考；`max_tokens` 从 1024 提升到 4096（单批 20 笔的 JSON 数组输出需要余量）
- 新增响应防御：`finish_reason === "length"` 或解析失败时记录告警日志（含 usage 中 reasoning_tokens），不再静默吞掉
- 测试跑器落地：按 Next.js 16 官方 Vitest 指南配置 `vitest.config.mts` + `npm run test`（CLAUDE.md 早已要求，本次为首个使用方）

## Impact

- 受影响 spec：`ai-classification`（新建能力规格）
- 受影响代码：`src/lib/ai-classify.ts`（约 10 行）、`vitest.config.mts`、`package.json`
- 不改 API 路由、不改数据库、不改前端
- 非目标：不支持非 OpenAI 兼容端点的思考参数差异；不改分类 prompt 本身
