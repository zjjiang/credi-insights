# Spec: 卡片管理

## ADDED Requirements

### Requirement: 用户可以管理多张信用卡

系统 SHALL 支持用户添加、查看、编辑多张信用卡，每张卡独立配置账单周期和邮箱订阅。

#### Scenario: 添加新卡片
- Given 用户在首页
- When 点击「+ 新增卡片」
- Then 显示表单，包含卡号、银行、账单日、还款日、IMAP 配置字段

#### Scenario: 查看卡片列表
- Given 用户已添加卡片
- When 访问首页
- Then 显示所有激活卡片，每张卡显示卡号后四位、本月累计、账单日

#### Scenario: 编辑卡片
- Given 用户在卡片详情页
- When 点击「设置」
- Then 显示编辑表单，可修改别名、账单日、IMAP 配置

#### Scenario: 停用卡片
- Given 用户在卡片设置页
- When 点击「停用卡片」并确认
- Then 卡片不再显示在列表中，历史交易保留

## API

### `GET /api/cards`
返回用户所有激活卡片：
```json
{
  "success": true,
  "data": {
    "cards": [
      {
        "id": "clxxx",
        "bank": "CMB",
        "cardLast4": "0094",
        "alias": "日常卡",
        "billingDay": 18,
        "dueDay": 8,
        "isActive": true,
        "monthlyTotal": 8234.50,
        "lastSyncAt": "2026-08-12T10:30:00Z"
      }
    ]
  }
}
```

**monthlyTotal 计算**：当前自然月（按 txDate）的 type=DEBIT 交易总额。

**lastSyncAt 计算**：该卡最新一笔 source=daily 的 Transaction.createdAt。

### `POST /api/cards`
创建新卡片：
```json
// Request
{
  "bank": "CMB",
  "cardLast4": "0094",
  "alias": "日常卡",
  "billingDay": 18,
  "dueDay": 8,
  "imapHost": "imap.qq.com",
  "imapPort": 993,
  "imapUser": "user@qq.com",
  "imapPassword": "password",
  "imapSubject": "每日信用管家"
}

// Response
{
  "success": true,
  "data": {
    "cardId": "clxxx"
  }
}
```

**校验**：
- `bank + cardLast4` 唯一，重复返回 400
- billingDay/dueDay 范围 1-31
- imapHost/imapUser/imapPassword/imapSubject 必填
- imapPort 默认 993

### `GET /api/cards/[cardId]`
返回卡片详情 + 统计：
```json
{
  "success": true,
  "data": {
    "id": "clxxx",
    "bank": "CMB",
    "cardLast4": "0094",
    "alias": "日常卡",
    "billingDay": 18,
    "dueDay": 8,
    "imapHost": "imap.qq.com",
    "imapPort": 993,
    "imapUser": "user@qq.com",
    "imapSubject": "每日信用管家",
    "isActive": true,
    "stats": {
      "monthlyTotal": 8234.50,
      "lastSyncAt": "2026-08-12T10:30:00Z",
      "transactionCount": 142
    }
  }
}
```

**注意**：不返回 `imapPassword`，前端显示为 `******`。

### `PATCH /api/cards/[cardId]`
更新卡片配置：
```json
// Request（所有字段可选）
{
  "alias": "备用卡",
  "billingDay": 25,
  "imapPassword": "new-password"
}

// Response
{
  "success": true
}
```

**校验**：
- 若更新 `bank` 或 `cardLast4`，检查唯一约束
- billingDay/dueDay 范围 1-31

### `DELETE /api/cards/[cardId]`
软删除卡片（设置 `isActive = false`）：
```json
{
  "success": true
}
```

**行为**：
- 卡片不再出现在列表中
- 历史交易保留，可通过 `/admin/transactions` 查看
- 可通过 PATCH 恢复（`isActive = true`）

## UI

### 卡片选择器（首页 `/`）
- 网格布局（2 列，响应式）
- 每张卡一个卡片组件：
  - 顶部：银行 emoji + 卡号（`•••• 0094`）+ 别名
  - 中部：本月累计（大字号 `¥8,234.50`）
  - 底部：账单日 + 还款日 + 最近同步时间
  - hover 效果：scale(1.02) + shadow-lg
  - 点击 → 跳转 `/cards/[cardId]`
- 底部：`[+ 新增卡片]` 按钮 → 跳转 `/cards/new`

### 新增卡片表单（`/cards/new`）
字段：
- 银行（下拉：CMB 招商银行 | SPDB 浦发银行 | ...）
- 卡号后四位（输入框，4 位数字）
- 别名（可选）
- 账单日（1-31）
- 还款日（1-31）
- IMAP 配置：
  - 主机（默认 `imap.qq.com`）
  - 端口（默认 993）
  - 用户名
  - 密码（type=password）
  - 邮件主题（默认 `每日信用管家`）
- 提交 → `POST /api/cards` → 成功后跳转首页

### 卡片设置（`/cards/[cardId]/settings`）
- 复用新增表单，预填现有值
- 密码字段显示 `******`，只有修改时才提交
- 增加「停用卡片」按钮 → 确认后 `DELETE /api/cards/[cardId]`

## 验收

- [ ] 可添加新卡片，填写所有必填项
- [ ] 首页显示所有卡片，本月累计正确
- [ ] 点击卡片进入详情页
- [ ] 可编辑卡片别名、账单日
- [ ] 重复添加同一张卡返回错误
- [ ] 停用卡片后不再显示
