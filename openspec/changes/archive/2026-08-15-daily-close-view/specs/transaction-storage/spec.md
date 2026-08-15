## ADDED Requirements

### Requirement: 日推覆盖度存储
系统 SHALL 持久化「已被日推覆盖的自然日」记录,供视图判断日结完整性。存储形态(Setting 键 vs 独立表)由 design.md D4 定稿。

#### Scenario: 覆盖度可查询
- **WHEN** 按日 Tab 加载某窗口
- **THEN** 系统能返回该窗口内每个自然日的覆盖状态(已覆盖 / 缺口)

### Requirement: 日推毕业留痕
系统 SHALL 能区分「原生月账单交易」与「经日推毕业的月账单交易」,以支持毕业高亮。判定依据(独立字段留痕 vs 复用 txTime 非空)由 design.md D6 定稿。

#### Scenario: 毕业交易可识别
- **WHEN** 一笔 source="daily" 的交易被月账单对账为 source="bill"
- **THEN** 系统 SHALL 保留可识别其「曾来自日推」的信号,供 UI 高亮
