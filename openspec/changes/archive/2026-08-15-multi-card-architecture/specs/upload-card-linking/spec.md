# Spec: 月账单关联卡片

## ADDED Requirements

### Requirement: 上传账单自动关联卡片

系统 SHALL 在上传月账单 `.msg` 文件时，自动识别卡号并关联到 Card，若卡片不存在则提示先添加。

#### Scenario: 上传已配置卡片的账单
- Given 用户已添加招商 0094 卡
- When 上传该卡的月账单
- Then 系统自动关联到该卡片，显示成功 toast

#### Scenario: 上传未配置卡片的账单
- Given 用户未添加浦发 1234 卡
- When 上传该卡的月账单
- Then 系统返回错误「卡片未配置，请先在首页添加卡片（卡号：1234）」

#### Scenario: 查看卡片历史账单
- Given 用户在卡片详情页
- When 切换到「账单」Tab
- Then 显示该卡的所有历史账单，包含账期、笔数、上传时间

#### Scenario: 账单列表显示卡片信息
- Given 用户在账单历史页
- When 查看账单列表
- Then 每条账单显示关联的卡片别名和卡号

## API 变更

### `POST /api/uploads`（现有接口，增加逻辑）

**新增步骤**：
1. 解析 `.msg` 文件得到 `cardLast4`（现有逻辑已提取）
2. 查询 `Card.findFirst({ where: { cardLast4 } })`
   - 若不存在 → 返回 `{success: false, error: "卡片未配置，请先在首页添加卡片（卡号：0094）", code: "CARD_NOT_FOUND"}`
   - 若存在多张（跨行相同后四位，极罕见）→ 取第一张或提示用户手动选择
3. 绑定 `Upload.cardId` 和所有 `Transaction.cardId`
4. 指纹去重合并时，保持 `categoryId` 不变（现有逻辑）

**响应变更**：
```json
// 成功
{
  "success": true,
  "data": {
    "uploadId": "clxxx",
    "cardId": "clyyy",
    "cardAlias": "日常卡"
  }
}

// 卡片不存在
{
  "success": false,
  "error": "卡片未配置，请先在首页添加卡片（卡号：0094）",
  "code": "CARD_NOT_FOUND",
  "cardLast4": "0094"
}
```

### `GET /api/uploads`（现有接口，增加字段）

返回 Upload 列表时，增加 `cardId` 和 `cardAlias`：
```json
{
  "success": true,
  "data": [
    {
      "id": "clxxx",
      "originalName": "bill_202408.msg",
      "cardId": "clyyy",
      "cardAlias": "日常卡",
      "cardLast4": "0094",
      "billingStart": "2026-07-18",
      "billingEnd": "2026-08-17",
      "status": "DONE",
      "txCount": 42,
      "createdAt": "2026-08-11T10:00:00Z"
    }
  ]
}
```

### `GET /api/cards/[cardId]/uploads`（新增）

返回该卡的历史账单列表：
```json
{
  "success": true,
  "data": {
    "uploads": [
      {
        "id": "clxxx",
        "originalName": "bill_202408.msg",
        "billingStart": "2026-07-18",
        "billingEnd": "2026-08-17",
        "dueDate": "2026-09-08",
        "txCount": 42,
        "createdAt": "2026-08-11T10:00:00Z"
      }
    ]
  }
}
```

## UI 变更

### 上传失败提示（前端处理）

POST /api/uploads 返回 `code: "CARD_NOT_FOUND"` 时：
```
┌────────────────────────────────────────┐
│  ⚠️ 无法识别卡片                        │
│                                        │
│  检测到卡号：0094                       │
│  该卡片尚未添加，请先在首页添加卡片      │
│                                        │
│  [返回首页添加卡片]  [取消]             │
└────────────────────────────────────────┘
```

点击「返回首页添加卡片」→ 跳转 `/cards/new`，预填 `cardLast4: "0094"`。

### 卡片详情页增加「账单历史」Tab（可选）

```
/cards/[cardId]
┌──────────────────────┐
│ 交易 | 账单 | 设置   │
└──────────────────────┘
```

- 交易 Tab：现有交易列表（默认）
- 账单 Tab：调用 `/api/cards/[cardId]/uploads`，显示账单列表（账期、笔数、上传时间）
- 设置 Tab：卡片配置表单

## 数据迁移

### 现有 Upload 关联到卡片

运行迁移脚本：
```sql
-- 假设已手动创建招商 0094 卡（cardId = 'clxxx'）
UPDATE Upload
SET cardId = 'clxxx'
WHERE cardLast4 = '0094';

UPDATE Transaction
SET cardId = 'clxxx'
WHERE cardLast4 = '0094' AND source = 'bill';
```

或通过 Prisma 脚本：
```typescript
const card = await prisma.card.findFirst({ where: { cardLast4: '0094' } });
await prisma.upload.updateMany({
  where: { cardLast4: '0094' },
  data: { cardId: card.id }
});
await prisma.transaction.updateMany({
  where: { cardLast4: '0094', source: 'bill' },
  data: { cardId: card.id }
});
```

## 验收

- [ ] 上传账单时，自动关联到对应卡片
- [ ] 若卡片不存在，返回友好错误并提示添加
- [ ] Upload 列表显示卡片别名
- [ ] 卡片详情页可查看历史账单
- [ ] 现有 Upload 已迁移关联到卡片
