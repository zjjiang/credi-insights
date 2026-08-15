## Why

当前只能通过手动上传月度 `.msg` 账单获取信用卡消费数据,时效性差(一个月才更新一次)。招商银行每天发送「每日信用管家」邮件到 Outlook 邮箱,包含当日逐笔消费明细。需要自动拉取这些日汇总邮件,让用户当天就能看到消费数据,而非等到月底。

## What Changes

- 新增 IMAP 邮箱连接模块,定时从 Outlook 拉取「每日信用管家」邮件
- 新增日汇总邮件解析器,提取逐笔交易(日期精确到秒、金额、卡号、商户)
- Transaction 表新增 `fingerprint` 字段(unique),用于跨源去重
- Transaction 表 `uploadId` 改为可选,日抓取的交易不关联 Upload
- 新增去重合并逻辑:日推送先入库,月账单后到时以月账单为准覆盖元数据,但保留用户已打的 categoryId
- 新增 API 端点 `POST /api/ingest/daily` 手动触发拉取
- 新增 CLI 脚本供 crontab 调度
- UI 新增独立 tab 展示日推送数据(与月账单 tab 分开)

## Capabilities

### New Capabilities
- `daily-ingest`: IMAP 邮件拉取 + 日汇总解析 + 指纹去重入库
- `daily-transactions-view`: 日推送交易的独立展示 tab

### Modified Capabilities
- `transaction-storage`: Transaction 表结构变更(新增 fingerprint、uploadId 可选化),月账单上传时需参与去重合并

## Impact

- **数据库**: Transaction 表 migration(新增字段 + 索引)
- **依赖**: 新增 `imapflow`、`mailparser` npm 包
- **配置**: `.env` 新增 IMAP 连接参数
- **现有功能**: 月账单上传流程需改造,写入前检查 fingerprint 是否已存在
- **安全**: IMAP 凭证需妥善管理(环境变量,不入库)
