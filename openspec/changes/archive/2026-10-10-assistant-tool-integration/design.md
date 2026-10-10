# Design: assistant-tool-integration

## Context

两侧工具实现重复且漂移；glm 截断修复（PR #13）只覆盖了 `ai-classify.ts`，chat 路由同样裸奔。

## Goals / Non-Goals

- Goal: 单一工具实现源（Single Source of Truth），两侧零重复
- Goal: 应用内助手具备分类/规则的完整管理闭环（查→建→验证）
- Non-Goal: 不改 sync_card 行为；不做前端工具确认交互

## Decisions

### D1: 注册表结构
`AiTool = { name, description, parameters: JSONSchema, run: (input) => Promise<unknown> }`，`aiTools: AiTool[]` 数组导出。run 内部做输入校验（缺 required 字段抛带中文信息的 Error）。

### D2: 两侧各自的转换器留在原文件
- chat 路由：`aiTools.map(t => ({type:'function', function:{name, description, parameters}}))` + `run` 分发
- MCP：`aiTools.map(t => ({name, description, inputSchema: parameters}))` + CallTool 分发
转换逻辑太薄，不值得再抽公共层。

### D3: MCP 独有的留在 MCP
`sync_card` 的审批流、`checkSyncRateLimit` 限流、数据库连接探测留在 mcp-server.ts。规则解析（parseRulePattern/matchesRule）从 mcp-server.ts 挪进注册表的 `apply_rules` 实现，MCP 侧删除本地副本。

### D4: glm 兼容参数进 chat 路由
与 #13 相同：`model.startsWith('glm')` → `thinking:{type:'disabled'}`；`max_tokens` 1024→4096（工具调用 JSON 参数也需要余量）。`ai-classify.ts` 已有同款逻辑，本变更内不抽公共 helper（两处调用形态不同，等第三处出现再抽）。

### D5: 测试策略
- `src/lib/ai-tools.test.ts`：mock `@/lib/db`，测 create_category 重名校验、create_rule 字段透传、apply_rules 的 dryRun 与 live、update_transaction_category 校验
- `src/app/api/ai/chat/route.test.ts`：mock `@/lib/ai-client`，断言 glm 请求带 thinking、工具注册表被完整转换为 OpenAI 格式、tool 消息回填循环正常结束
- mcp-server.ts 为入口脚本（tsx 直跑），不单测，靠 `npx tsc --noEmit` 类型检查兜底
