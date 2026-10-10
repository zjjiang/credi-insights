## Tasks

- [x] 1.1 按官方指南安装 vitest、@vitejs/plugin-react、jsdom、@testing-library/react、@testing-library/dom、vite-tsconfig-paths，新增 `vitest.config.mts` 与 `test` script
- [x] 1.2 编写 `src/lib/ai-classify.test.ts`（RED）：glm 模型请求含 `thinking:{type:'disabled'}`、qwen 不含、max_tokens=4096、finish_reason=length 返回空数组并 warn、正常 JSON 解析
- [x] 2.1 实现 `ai-classify.ts` 修复：glm 前缀附加 thinking 参数、max_tokens 4096、截断/解析失败 warn 日志（GREEN）
- [x] 3.1 `npm run test` 全绿；`npm run build` 通过
- [x] 3.2 真机验证：对 225 笔账单重跑 reclassify，确认分类数显著提升
- [x] 3.3 补充规则关键词覆盖真实商户名（拉扎斯/申通地铁/公共事业缴费/抖音/DIGITALOCEAN 等，DB 数据）
