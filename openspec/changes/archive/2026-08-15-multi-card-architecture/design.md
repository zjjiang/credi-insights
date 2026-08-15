# Design: 多卡架构

## D1: Card 数据模型

```prisma
model Card {
  id          String   @id @default(cuid())
  bank        String   // "CMB" | "SPDB" | ...
  cardLast4   String   // "0094"
  alias       String?  // 用户自定义别名："日常卡"
  billingDay  Int      // 账单日 1-31
  dueDay      Int      // 还款日 1-31
  
  // IMAP 订阅配置（卡级独立）
  imapHost     String   // "imap.qq.com"
  imapPort     Int      // 993
  imapUser     String   // "user@qq.com"
  imapPassword String   // 明文存储（后续可加密）
  imapSubject  String   // 邮件主题过滤："每日信用管家"
  
  isActive    Boolean  @default(true)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  
  transactions Transaction[]
  uploads      Upload[]
  
  @@unique([bank, cardLast4])
}
```

**字段说明**：
- `bank + cardLast4` 唯一索引 → 防止重复添加同一张卡
- IMAP 字段必填（选项 A），每张卡独立配置，不共享全局
- `imapSubject` 用于 IMAP SUBJECT 过滤，避免拉到无关邮件

## D2: Transaction/Upload 关联

```prisma
model Transaction {
  // ... 现有字段
  cardId      String?
  card        Card?    @relation(fields: [cardId], references: [id], onDelete: SetNull)
}

model Upload {
  // ... 现有字段
  cardId      String?
  card        Card?    @relation(fields: [cardId], references: [id], onDelete: SetNull)
}
```

**迁移策略**：
1. 添加 Card 表 + cardId 字段（nullable）
2. 用户手动创建招商 0094 卡
3. 运行迁移脚本：`UPDATE Transaction SET cardId = ? WHERE cardLast4 = '0094'`
4. 后续可考虑 cardId NOT NULL + 外键约束

## D3: 路由结构

```
/                        → 卡片选择器（GET /api/cards）
/cards/new               → 新增卡片表单
/cards/[cardId]          → 卡片详情（GET /api/transactions?cardId=xxx）
/cards/[cardId]/settings → 卡片设置（PATCH /api/cards/[cardId]）
```

**弃用路由**：
- 原首页 `/` 的上传历史 + 二级 Tab → 迁移到卡片详情页
- 原 `/api/transactions/by-day` → 改为 `/api/cards/[cardId]/transactions`，按日分组逻辑保持

## D4: API 设计

### 卡片管理
- `GET /api/cards` → `{cards: [{id, bank, cardLast4, alias, billingDay, dueDay, monthlyTotal, lastSyncAt}]}`
- `POST /api/cards` → body: `{bank, cardLast4, alias?, billingDay, dueDay, imapHost, imapPort, imapUser, imapPassword, imapSubject}`
- `GET /api/cards/[cardId]` → 卡片详情 + 基础统计
- `PATCH /api/cards/[cardId]` → 更新卡片配置
- `DELETE /api/cards/[cardId]` → 软删除（isActive = false）

### 日推同步
- `POST /api/ingest/card/[cardId]` → 使用该卡的 IMAP 配置，拉取日推邮件，写入 Transaction(cardId)，更新覆盖度

### 交易查询
- `GET /api/cards/[cardId]/transactions?days=45&before=YYYY-MM-DD` → 按日分组，返回格式同 `/api/transactions/by-day`

### 月账单上传
- `POST /api/uploads` 增加逻辑：
  1. 解析 `.msg` 得到 `cardLast4`
  2. 查询 `Card.findFirst({cardLast4})`（假设 cardLast4 足够区分）
  3. 若不存在 → 返回 `{success: false, error: "卡片未配置，请先添加卡片"}`
  4. 若存在 → 绑定 `Upload.cardId` 和 `Transaction.cardId`

## D5: UI 组件结构

```
src/app/
  page.tsx                     → 卡片选择器
  cards/
    new/
      page.tsx                 → 新增卡片表单
    [cardId]/
      page.tsx                 → 卡片详情（交易列表）
      settings/
        page.tsx               → 卡片设置

src/components/
  cards/
    CardGrid.tsx               → 卡片选择器网格
    CardItem.tsx               → 单个卡片（展示卡号、银行、本月累计）
    CardForm.tsx               → 新增/编辑卡片表单
  transactions/
    TransactionList.tsx        → 交易列表（按日分组，复用 DailyView 逻辑）
    TransactionRow.tsx         → 单笔交易行（已有，保持）
```

## D6: 来源标识逻辑

交易列表显示来源 Badge：
- `source === "daily" && !graduatedFromDaily` → `[日推]` 黄色
- `source === "bill" && !graduatedFromDaily` → `[已入库]` 绿色
- `source === "bill" && graduatedFromDaily` → `[日推带标]` 绿底黄边

## D7: 卡片视觉设计（简洁版）

```
┌────────────────────────────┐
│ 🏦 招商银行                 │
│ •••• 0094      日常消费卡   │
│                            │
│ 本月消费  ¥8,234.50         │
│ 账单日 18  |  还款日 8       │
│                            │
│ 最近同步：2 小时前          │
│              [查看详情 →]   │
└────────────────────────────┘
```

- 纯色卡片（slate-800 背景）+ 银行 icon（text emoji）
- 卡号前 12 位用点号遮蔽
- 本月累计大字号（text-2xl）
- 账单日/还款日小字提示（text-sm text-muted）
- hover 效果：轻微 scale + shadow

## D8: IMAP 配置安全

- 密码明文存储在 Setting 表（与现有 ANTHROPIC_API_KEY 一致）
- 后续可迁移到环境变量或加密存储
- API 返回卡片列表时，不返回 `imapPassword`（仅在设置页显示 `******`）

## D9: 覆盖度追踪变化

- 原 Setting 键 `daily_covered_dates` 为全局覆盖度
- 改为 **卡级覆盖度**：`daily_covered_dates_{cardId}` → 每张卡独立记录已覆盖日期
- `/api/ingest/card/[cardId]` 写入对应卡的覆盖度键

## D10: 现有功能保持

- 日推毕业留痕（graduatedFromDaily）保持
- 覆盖度标记（已关账/缺口）保持
- 按日分组、陈旧交易删除、缺口补拉 → 全部保持，只是 API 从 `/api/transactions/by-day` 迁移到 `/api/cards/[cardId]/transactions`
