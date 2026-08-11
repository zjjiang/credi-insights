## 1. 数据库变更

- [x] 1.1 Prisma schema: Transaction 新增 `fingerprint String? @unique`、`txTime String?`、`source String @default("bill")`
- [x] 1.2 Prisma schema: Transaction `uploadId` 改为可选 (`String?`),解除 required 约束
- [x] 1.3 运行 migration 并应用(baseline 现有 migrations + deploy 新 migration)
- [x] 1.4 回填脚本:DB 现为空,无需回填(N/A)

## 2. 环境配置

- [x] 2.1 `.env` + `.env.example` 新增 IMAP_HOST、IMAP_PORT、IMAP_USER、IMAP_PASS、INGEST_SECRET
- [x] 2.2 `package.json` 添加 `imapflow`、`mailparser`、`@types/mailparser`
- [x] 2.3 `package.json` 添加 `"ingest": "tsx scripts/ingest-daily.ts"` script

## 3. IMAP 客户端

- [x] 3.1 创建 `src/lib/imap/client.ts`:连接配置、fetchNewEmails 函数
- [x] 3.2 实现邮件过滤:FROM=招商银行信用卡、SUBJECT 含每日信用管家、UID > lastUID
- [x] 3.3 实现游标读写:从 Setting 表读写 `imap_last_uid`

## 4. 日汇总解析器

- [x] 4.1 创建 `src/lib/imap/parse-daily.ts`:HTML → 交易数组
- [x] 4.2 实现解析逻辑:日期行匹配 + 三行一组循环(时间/金额/详情)
- [x] 4.3 输出类型定义 `DailyTransaction`(含 txTime 字段)

## 5. 入库与去重

- [x] 5.1 创建 `src/lib/imap/ingest.ts`:编排拉取→解析→入库流程
- [x] 5.2 实现 fingerprint 生成函数(抽到 `src/lib/fingerprint.ts` 供两处共享)
- [x] 5.3 实现 upsert 逻辑:fingerprint 不存在则 insert,存在则 skip
- [x] 5.4 入库后触发 AI 分类(复用 classifyTransactions)
- [x] 5.5 成功后更新游标(逐邮件推进,失败中断)

## 6. 月账单上传改造

- [x] 6.1 修改 `src/app/api/uploads/route.ts`:写入前计算 fingerprint
- [x] 6.2 实现合并逻辑:命中已有记录时覆盖元数据但保留 categoryId
- [x] 6.3 新写入的月账单交易也填充 fingerprint 字段;AI 分类仅针对新增

## 7. 触发入口

- [x] 7.1 创建 `src/app/api/ingest/daily/route.ts`:POST handler(含 INGEST_SECRET 校验)
- [x] 7.2 创建 `scripts/ingest-daily.ts`:CLI 入口
- [x] 7.3 两个入口共享 `runDailyIngest` 核心逻辑

## 8. 验证

- [x] 8.1 build 通过、lint 通过、新 API 路由注册成功
- [x] 8.2 解析器对样例邮件正确(text + HTML 两条路径,6/6 笔)
- [x] 8.3 去重:fingerprint 唯一约束 + 合并测试确认无重复行
- [x] 8.4 合并正确:DB 实测覆盖元数据、保留标签、行数不增
- [ ] 8.5 待用户配置真实 IMAP 凭证后,`npm run ingest` 端到端验证拉取
