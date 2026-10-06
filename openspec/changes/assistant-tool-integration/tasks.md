## Tasks

- [x] 1.1 编写 `src/lib/ai-tools.test.ts`（RED）：10 个工具的注册表完整性、create_category 重名拒绝、create_rule 缺字段拒绝、apply_rules dryRun/live、update_transaction_category 分类存在性校验
- [x] 2.1 实现 `src/lib/ai-tools.ts`：10 个共享工具（定义 + run），规则解析复用 `src/lib/rule-parser.ts`
- [x] 2.2 重构 `mcp-server.ts` 为薄适配层（sync_card/审批/限流留在本地），`npx tsc --noEmit` 通过
- [x] 3.1 编写 `src/app/api/ai/chat/route.test.ts`（RED）：glm 请求带 thinking、max_tokens 4096、注册表完整转换为 OpenAI 格式
- [x] 3.2 重构 chat 路由使用注册表 + glm 兼容参数（GREEN）
- [x] 4.1 `npm run test` 全绿；`npm run build` 通过
- [x] 4.2 `npm run mcp:dev` 冒烟：工具列表正常、list_categories 可调用
- [x] 4.3 真机验证：助手「加一个分类叫测试」→ 成功；「看看现在有哪些规则」→ 返回列表；删除测试分类
