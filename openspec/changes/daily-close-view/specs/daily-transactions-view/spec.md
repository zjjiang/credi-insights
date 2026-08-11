## ADDED Requirements

### Requirement: 按日 Tab 视图
UI SHALL 提供独立的「按日」Tab,与月账单 Tab 分开,按自然日分组倒序展示交易,不按 source 过滤。

#### Scenario: 查看按日交易
- **WHEN** 用户切换到「按日」Tab
- **THEN** 展示交易按 txDate 自然日分组、日期倒序;每日显示当日总额与逐笔明细

#### Scenario: 对账后交易仍留在发生日
- **WHEN** 某笔日推交易被月账单对账(source 由 daily 变为 bill)
- **THEN** 该交易 SHALL 仍出现在其 txDate 对应的日分组中,不因 source 变化而消失

#### Scenario: 默认窗口与向前翻阅
- **WHEN** 打开按日 Tab
- **THEN** 默认展示最近窗口(如 45 天),并 SHALL 支持向前翻阅至全部历史

### Requirement: 日结覆盖度提示
按日 Tab SHALL 依据覆盖度记录,标注每个自然日单元「已关账」或「有缺口」,并对缺口日提供手动补拉入口。

#### Scenario: 已覆盖日标记已关账
- **WHEN** 某自然日已收到对应日推邮件
- **THEN** 该日单元标记为「已关账」

#### Scenario: 缺口日标记并提示补拉
- **WHEN** 某自然日在覆盖范围内但未收到日推邮件
- **THEN** 该日单元标记「⚠ 未收到日推,数据可能不全」,并提供「手动补拉这天」入口

#### Scenario: 含缺口的汇总标注
- **WHEN** 某汇总区间(如本周/本期)包含至少一个缺口日
- **THEN** 汇总总额 SHALL 标注「含缺口,数字可能偏低」

### Requirement: 陈旧未对账交易人工干预
按日 Tab SHALL 允许用户删除长期未被月账单对账的日推交易。

#### Scenario: 删除陈旧未对账交易
- **WHEN** 用户对某笔 source="daily" 且超过阈值天数仍未对账的交易触发删除
- **THEN** 系统删除该交易,并从相关聚合中移除

### Requirement: 对账毕业高亮
月账单 Tab SHALL 高亮标注从日推带标签毕业而来的交易。

#### Scenario: 标注日推毕业交易
- **WHEN** 月账单 Tab 中某笔交易曾经历日推→对账毕业(带用户标签)
- **THEN** 该行显示「日推带标」标识

#### Scenario: 日推打的标签毕业后保留
- **WHEN** 用户在按日 Tab 为某笔交易设置 category,该交易随后被月账单对账
- **THEN** categoryId SHALL NOT 被覆盖,标签在月账单 Tab 中保留
