## ADDED Requirements

### Requirement: IMAP 邮件拉取
系统 SHALL 通过 IMAP 协议连接 Outlook 邮箱,拉取发件人为「招商银行信用卡」且标题包含「每日信用管家」的未处理邮件。

#### Scenario: 正常拉取新邮件
- **WHEN** 触发 ingest(API 或 CLI)
- **THEN** 系统连接 IMAP,搜索 UID > lastProcessedUID 的匹配邮件,返回邮件 HTML body 列表

#### Scenario: 无新邮件
- **WHEN** 触发 ingest 但无新匹配邮件
- **THEN** 系统返回空列表,不报错,不更新游标

#### Scenario: IMAP 连接失败
- **WHEN** IMAP 凭证错误或网络不可达
- **THEN** 系统抛出明确错误,包含连接失败原因,不更新游标

### Requirement: 游标管理
系统 SHALL 在 Setting 表中维护 `imap_last_uid` 记录已处理的最大邮件 UID,确保不重复处理。

#### Scenario: 成功处理后更新游标
- **WHEN** 一批邮件全部解析并入库成功
- **THEN** 系统将 `imap_last_uid` 更新为本批最大 UID

#### Scenario: 处理中途失败
- **WHEN** 某封邮件解析或入库失败
- **THEN** 游标仅更新到最后一封成功处理的邮件 UID

### Requirement: 日汇总邮件解析
系统 SHALL 从「每日信用管家」邮件 HTML 中提取消费明细,每笔交易包含:日期、时间(HH:mm:ss)、金额(CNY)、卡号尾号、交易类型、商户名。

#### Scenario: 解析标准格式邮件
- **WHEN** 邮件包含 "YYYY/MM/DD 您的消费明细如下" + 三行一组的交易数据
- **THEN** 系统提取所有交易,日期精确到秒,金额为 Decimal

#### Scenario: 邮件无消费明细
- **WHEN** 邮件中无匹配的消费行(如当日无消费)
- **THEN** 系统返回空交易列表,不报错

### Requirement: 指纹去重入库
系统 SHALL 为每笔交易生成 fingerprint = `${date}_${cardLast4}_${amount}`,以 unique 约束防重复,支持日推送与月账单的合并。

#### Scenario: 日推送新交易入库
- **WHEN** fingerprint 不存在于 DB
- **THEN** 插入新 Transaction,source 标记为 "daily"

#### Scenario: 月账单覆盖日推送
- **WHEN** 月账单上传时发现 fingerprint 已存在(来自日推送)
- **THEN** 以月账单数据覆盖 merchant、txStatus 等元数据,但 SHALL NOT 覆盖 categoryId(保留用户标签)

#### Scenario: 日推送遇到已有月账单数据
- **WHEN** 日推送解析的交易 fingerprint 已存在(来自更早的月账单)
- **THEN** 跳过该笔,不覆盖

### Requirement: 触发方式
系统 SHALL 提供 HTTP API (`POST /api/ingest/daily`) 和 CLI 脚本两种触发入口。

#### Scenario: API 触发
- **WHEN** 调用 `POST /api/ingest/daily`
- **THEN** 执行完整 ingest 流程,返回 `{ success, data: { fetched, inserted, skipped } }`

#### Scenario: CLI 触发
- **WHEN** 执行 `npx tsx scripts/ingest-daily.ts`
- **THEN** 执行同样的 ingest 流程,结果输出到 stdout
