## ADDED Requirements

### Requirement: 日推送独立 Tab
UI SHALL 提供独立的「日推送」Tab,与现有月账单 Tab 分开展示日抓取的交易数据。

#### Scenario: 查看日推送交易列表
- **WHEN** 用户切换到「日推送」Tab
- **THEN** 展示所有 source="daily" 的交易,按日期倒序分组

#### Scenario: 日推送交易打标签
- **WHEN** 用户在日推送 Tab 中为某笔交易设置 category
- **THEN** categoryId 被更新,且后续月账单合并时 SHALL NOT 覆盖此标签
