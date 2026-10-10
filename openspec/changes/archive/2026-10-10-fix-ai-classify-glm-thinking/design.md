# Design: fix-ai-classify-glm-thinking

## Context

`classifyBatch` 通过 OpenAI 兼容 SDK 调用 `client.chat.completions.create`，配置来自 DB Setting（`AI_BASE_URL`/`AI_MODEL`，默认 `qwen-plus`）。GLM 推理模型默认开启思考，思考与正文共享 `max_tokens`。

## Goals / Non-Goals

- Goal: GLM 模型下批次解析成功率恢复 ~100%
- Goal: 失败可观测（日志）
- Non-Goal: 不抽象多 provider 适配层；不动 prompt 工程

## Decisions

### D1: 用模型名前缀判断是否传 `thinking`
`model.startsWith('glm')` → 附带 `thinking: { type: 'disabled' }`。其他模型（qwen-plus 等）不传，避免未知参数被端点拒绝。简单、无配置项。

### D2: `max_tokens` 固定 4096
单批最多 20 笔 × ~30 tokens/条 JSON ≈ 600 tokens，4096 留足余量。不做成配置项（YAGNI）。

### D3: 防御与日志
- `finish_reason === 'length'` → `console.warn` 输出 model、completion_tokens、reasoning_tokens，返回空数组（与现状一致的降级语义，但可观测）
- JSON.parse 失败 → 现有 `catch { return [] }` 补一条 warn 日志

### D4: Vitest 按官方指南最小落地
`vitest` + `@vitejs/plugin-react` + `jsdom` + `vite-tsconfig-paths`（官方四件套），`environment: 'jsdom'`。本变更的测试是纯 lib 单测（mock OpenAI client），组件测试留待后续 change。

### D5: 测试策略
不 mock `openai` 包内部，而是 mock `./ai-client` 模块的 `getAiClient`，捕获传入 `create` 的完整参数：
- 断言 glm 模型请求含 `thinking: {type:'disabled'}`，qwen 模型不含（RED→GREEN 的核心断言）
- 断言 `max_tokens === 4096`
- 断言 finish_reason=length 时返回 `[]` 且 warn 被调用
- 断言正常 JSON 数组被解析返回
