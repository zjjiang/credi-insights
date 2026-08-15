# Spec: 卡片交易视图

## ADDED Requirements

### Requirement: 展示卡片交易流水

系统 SHALL 展示单张卡片的交易流水，按日分组、倒序排列，保持日结逻辑（覆盖度、缺口标记、来源 Badge）。

#### Scenario: 查看卡片交易
- Given 用户点击卡片进入详情页
- When 页面加载
- Then 显示该卡的所有交易，按日期分组倒序

#### Scenario: 显示覆盖状态
- Given 卡片有交易数据
- When 查看某一天的交易
- Then 显示该日的覆盖状态（已关账 / 缺口）

#### Scenario: 区分交易来源
- Given 交易来自日推
- When 显示交易行
- Then 显示黄色「日推」Badge

#### Scenario: 日推带标交易
- Given 交易由日推入库后被月账单对账
- When 显示交易行
- Then 显示绿底黄边「日推带标」Badge

#### Scenario: 缺口补拉
- Given 某日显示「缺口」标记
- When 点击「补拉」按钮
- Then 系统拉取该日的日推邮件并更新

#### Scenario: 删除陈旧交易
- Given 日推交易超过 45 天未被对账
- When 显示交易行
- Then 显示「陈旧未对账」警告和删除按钮

## API

### `GET /api/cards/[cardId]/transactions?days=45&before=YYYY-MM-DD`
返回该卡的交易，按日分组：
```json
{
  "success": true,
  "data": {
    "window": {
      "start": "2026-06-28",
      "end": "2026-08-11",
      "days": 45
    },
    "hasGap": true,
    "days": [
      {
        "date": "2026-08-11",
        "covered": true,
        "debit": 523.00,
        "credit": 0,
        "transactions": [
          {
            "id": "clxxx",
            "txDate": "2026-08-11",
            "txTime": "10:26:03",
            "merchant": "支付宝-便利店",
            "amount": 28.00,
            "type": "DEBIT",
            "source": "daily",
            "graduatedFromDaily": false,
            "categoryId": null,
            "category": null
          }
        ]
      }
    ]
  }
}
```

**查询逻辑**（复用 `/api/transactions/by-day` 逻辑，增加 cardId 过滤）：
1. 窗口：默认 45 天，before 默认今天
2. 查询 Transaction WHERE cardId = ? AND txDate IN [start, end]
3. 读取覆盖度 Setting `daily_covered_dates_{cardId}`
4. 计算每日 covered 状态、debit/credit 总额
5. 按日期倒序返回

## UI

### 页面布局（`/cards/[cardId]`）
```
┌────────────────────────────────────────┐
│  招商 0094  [🔄 同步邮箱] [⚙️ 设置]    │
│  ──────────────────────────────────    │
│  [显示 45 天数据]                       │
│  ⚠️ 部分日期未收到日推，数字可能偏低    │  ◄─ hasGap 时显示
│  ──────────────────────────────────    │
│  2026-08-11  ￥523.00  ✓ 已关账  ▼     │
│    10:26 支付宝-便利店  ￥28  [日推]   │
│    14:03 京东-数码      ￥50  [日推]   │
│  ──────────────────────────────────    │
│  2026-08-10  ￥120.00  ⚠ 缺口 [补拉]   │  ◄─ !covered
│  ──────────────────────────────────    │
│  2026-06-20  ￥80.00  ✓ 已关账  ▼      │
│    09:15 美团-餐饮  ￥80  [已入库]     │
│         ⚠️ 陈旧未对账（45天+）[删除]   │  ◄─ source=daily && 超 45 天
└────────────────────────────────────────┘
```

### 组件复用
- 复用 `DailyView` / `DayCard` 组件（现有）
- 复用 `TransactionRow` 组件（现有）
- 新增来源 Badge 逻辑（见下）

### 来源 Badge

根据 `source` 和 `graduatedFromDaily` 显示：
```typescript
function getSourceBadge(tx: Transaction) {
  if (tx.source === "daily" && !tx.graduatedFromDaily) {
    return <Badge variant="outline" className="bg-yellow-50 text-yellow-700">日推</Badge>;
  }
  if (tx.source === "bill" && tx.graduatedFromDaily) {
    return <Badge variant="outline" className="bg-gradient-to-r from-green-50 to-yellow-50 text-green-700">日推带标</Badge>;
  }
  if (tx.source === "bill") {
    return <Badge variant="outline" className="bg-green-50 text-green-700">已入库</Badge>;
  }
  return null;
}
```

### 覆盖度标记

每日卡片右上角：
- `covered: true` → `<Badge className="bg-green-600">✓ 已关账</Badge>`
- `covered: false` → `<Badge className="bg-amber-600">⚠ 缺口</Badge> <Button size="sm">补拉</Button>`

### 陈旧交易警告

`source === "daily"` 且距今超 45 天：
- 交易行下方显示：`⚠️ 陈旧未对账（45天+）<Button variant="ghost" size="sm">删除</Button>`
- 点击删除 → `DELETE /api/transactions/[txId]`

## 分页（可选，后续迭代）

当前 window 固定 45 天，向前翻页：
- 底部「加载更多」按钮 → before 设为当前最早日期的前一天
- 或无限滚动

## 验收

- [ ] 访问 `/cards/[cardId]` 显示该卡交易，按日分组
- [ ] 每日显示总额和覆盖状态
- [ ] 来源 Badge 正确显示（日推/已入库/日推带标）
- [ ] 缺口日显示「缺口」+ 补拉按钮
- [ ] hasGap 时顶部显示警告横幅
- [ ] 陈旧交易显示删除入口
- [ ] 单笔交易可修改分类、备注
