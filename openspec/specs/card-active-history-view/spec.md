# card-active-history-view Specification

## Purpose
TBD - created by archiving change split-active-history-tabs. Update Purpose after archive.
## Requirements
### Requirement: 卡片详情页按活跃/历史拆分为两个 Tab

系统 SHALL 在卡片详情页提供「活跃流水」「历史账单」两个 Tab，默认选中「活跃流水」。

#### Scenario: 默认进入活跃流水
- Given 用户打开某张卡片详情页
- When 页面加载完成
- Then 默认显示「活跃流水」Tab 内容，包含「同步日推」按钮和按日流水列表

#### Scenario: 切换到历史账单
- Given 用户在卡片详情页
- When 点击「历史账单」Tab
- Then 显示「上传月账单」按钮、账单周期选择器、报告下载/重新分类按钮及明细/未分类/大额面板

### Requirement: 活跃流水按最新账单账期划分下限

系统 SHALL 以该卡所有 `status = DONE` 且 `billingEnd` 不为空的账单中最大的 `billingEnd` 作为活跃流水的日期下限，只展示晚于该日期的交易。

#### Scenario: 存在已完成账单
- Given 某卡最新一期已完成账单的 billingEnd 为 2026-07-15
- When 用户查看活跃流水
- Then 只显示 txDate 晚于 2026-07-15 的交易（不含未关联账单的孤儿交易时的这部分）

#### Scenario: 没有任何有效账期的账单
- Given 某卡所有账单的 billingEnd 均为空，或该卡没有任何账单
- When 用户查看活跃流水
- Then 不做日期下限过滤，展示全部近期交易（与拆分前行为一致）

### Requirement: 未关联账单的交易始终在活跃流水可见

系统 SHALL 无条件将 `uploadId` 为空的交易包含在活跃流水中，不受日期下限过滤影响，防止指纹匹配失败的交易在活跃与历史视图中同时不可见。

#### Scenario: 存在匹配失败的历史孤儿交易
- Given 某笔日推交易 txDate 早于活跃流水日期下限，且未被任何账单关联（uploadId 为空）
- When 用户查看活跃流水
- Then 该笔交易仍出现在列表中，可对其进行分类等操作

