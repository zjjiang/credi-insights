## MODIFIED Requirements

### Requirement: Transaction 表结构
Transaction 表 SHALL 包含以下新增字段:
- `fingerprint String? @unique` — 去重指纹,格式 `${date}_${cardLast4}_${amount}`
- `txTime String?` — 精确交易时间 "HH:mm:ss"(日推送提供,月账单无)
- `source String @default("bill")` — 数据来源:"bill"(月账单) | "daily"(日推送)

`uploadId` 字段 SHALL 改为可选(`String?`),日推送交易不关联 Upload。

#### Scenario: 日推送交易无 uploadId
- **WHEN** 通过日 ingest 插入交易
- **THEN** uploadId 为 null,source 为 "daily"

#### Scenario: 月账单交易保持现有行为
- **WHEN** 通过月账单上传插入交易
- **THEN** uploadId 指向对应 Upload,source 为 "bill"

### Requirement: 月账单上传参与去重
月账单上传流程 SHALL 在写入 Transaction 前计算 fingerprint,若已存在则执行合并而非新增。

#### Scenario: 月账单遇到已有日推送数据
- **WHEN** 月账单中某笔交易的 fingerprint 已存在于 DB(source="daily")
- **THEN** 更新该条记录:覆盖 merchant、txStatus、uploadId、source→"bill",但 SHALL NOT 覆盖 categoryId
