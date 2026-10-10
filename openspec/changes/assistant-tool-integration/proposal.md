# Proposal: 统一 AI 工具层，应用内助手支持建分类/建规则

## Why

工具实现目前散落两处且互不一致：`mcp-server.ts`（Claude Desktop 用，9 个工具，718 行）和 `/api/ai/chat`（应用内 AI 助手，4 个工具）。同一能力两套写法（`get_transactions` vs `query_transactions`），修 bug 要改两遍（glm 思考截断问题在 chat 路由就还留着——`max_tokens: 1024` 未关 thinking）。应用内助手缺「创建分类」「查看规则列表」等日常管理能力，用户对着助手说"加一个分类"无法完成。

## What Changes

- 新建共享工具注册表 `src/lib/ai-tools.ts`：每个工具 = `{ name, description, parameters(JSON Schema), run(input) }`，合并两侧能力为 10 个共享工具（list_cards / get_transactions / get_stats / list_categories / create_category / list_rules / create_rule / update_transaction_category / bulk_update_category / apply_rules）
- `mcp-server.ts` 改为薄适配层：从注册表转换 MCP tool 定义 + CallTool 分发；`sync_card`（含审批与限流）保留在 MCP 侧不进注册表
- `/api/ai/chat` 改为薄适配层：从注册表转换 OpenAI tools 格式；助手新增 create_category、list_rules、get_stats 三个工具
- chat 路由同步修复 glm 思考截断（`thinking:{type:'disabled'}` + `max_tokens` 提升），与 PR #13 同款

## Impact

- 受影响 spec：`ai-tools`（新建能力规格）
- 受影响代码：`src/lib/ai-tools.ts`（新）、`mcp-server.ts`（大幅瘦身）、`src/app/api/ai/chat/route.ts`（瘦身）
- 不改数据库 schema、不改前端（AiSidebar 的 `tool_result` 渲染已通用）
- 非目标：助手侧不做 sync_card（邮件同步不该在聊天里触发）；不做工具调用确认 UI
