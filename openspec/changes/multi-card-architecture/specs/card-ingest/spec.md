# Spec: 卡级日推同步

## ADDED Requirements

### Requirement: 卡片支持独立邮箱同步

系统 SHALL 支持每张卡片独立触发邮箱同步，拉取该卡的日推邮件，写入交易并更新覆盖度。

#### Scenario: 手动同步卡片
- Given 用户在卡片详情页
- When 点击「同步邮箱」按钮
- Then 系统使用该卡的 IMAP 配置拉取新邮件，写入交易

#### Scenario: 同步成功
- Given 邮箱有新的日推邮件
- When 触发同步
- Then 显示 toast "同步成功，新增 8 笔交易"

#### Scenario: 同步失败
- Given IMAP 配置错误
- When 触发同步
- Then 显示 toast "IMAP 连接失败，请检查配置"

#### Scenario: 覆盖度独立记录
- Given 用户有招商和浦发两张卡
- When 同步招商卡
- Then 只更新招商卡的覆盖度，浦发卡不受影响

## API

### `POST /api/ingest/card/[cardId]`
触发该卡的日推同步：
```json
// Request（可选 body）
{
  "start": "2026-08-01",  // 可选：指定起始日期（补拉）
  "end": "2026-08-11"     // 可选：指定结束日期（默认今天）
}

// Response
{
  "success": true,
  "data": {
    "fetched": 10,        // 拉取到的邮件数
    "inserted": 8,        // 新增交易数
    "updated": 2,         // 更新交易数（指纹去重）
    "coveredDates": ["2026-08-01", "2026-08-02", ...]
  }
}
```

**鉴权**：使用 `isIngestAuthorized`（检查 INGEST_SECRET）。

**行为**：
1. 读取 `Card` 的 IMAP 配置（host/port/user/password/subject）
2. 连接 IMAP，使用 `imapSubject` 过滤邮件
3. 若未指定 start/end：增量拉取（使用 Setting `imap_last_uid_{cardId}` 游标）
4. 若指定 start/end：按日期范围搜索（不移动游标）
5. 解析邮件 → 提取交易 + coveredDates
6. 指纹去重 → 写入 Transaction（绑定 cardId）
7. 更新覆盖度 Setting `daily_covered_dates_{cardId}`
8. 更新游标 Setting `imap_last_uid_{cardId}`（增量模式）

**错误处理**：
- IMAP 连接失败 → 500 `"IMAP 连接失败，请检查配置"`
- 卡片不存在 → 404
- 卡片未激活 → 400 `"卡片已停用"`

## UI

### 卡片详情页同步按钮
- 位置：页面右上角 `[🔄 同步邮箱]` 按钮
- 点击 → `POST /api/ingest/card/[cardId]`（无 body，增量拉取）
- loading 态：按钮 disabled + spinner
- 成功：toast 提示「同步成功，新增 8 笔交易」
- 失败：toast 提示错误信息

### 缺口补拉（保持现有逻辑）
- 缺口日的卡片显示「缺口」标记 + `[补拉]` 按钮
- 点击 → `POST /api/ingest/card/[cardId]` body `{start: "2026-08-05", end: "2026-08-05"}`

## 覆盖度键命名

- 全局覆盖度（弃用）：`daily_covered_dates`
- 卡级覆盖度：`daily_covered_dates_{cardId}`
- 卡级 UID 游标：`imap_last_uid_{cardId}`

**迁移**：
- 首次同步时，若不存在 `imap_last_uid_{cardId}`，默认为 0（从头拉取）
- 现有全局 `daily_covered_dates` 可手动迁移到招商 0094 卡的键

## IMAP 查询逻辑

### 增量模式（无 start/end）
```typescript
const lastUid = await getSetting(`imap_last_uid_${cardId}`) ?? "0";
const searchCriteria = {
  subject: card.imapSubject,
  uid: `${parseInt(lastUid) + 1}:*`  // UID > lastUid
};
```

### 日期范围模式（有 start/end）
```typescript
const searchCriteria = {
  subject: card.imapSubject,
  since: new Date(start),
  before: new Date(end + 1day)  // IMAP before 是 exclusive
};
```

## 验收

- [ ] 点击同步按钮，能拉取新邮件并写入交易
- [ ] 成功后 toast 显示新增笔数
- [ ] 多次同步不会重复写入（指纹去重）
- [ ] 缺口日点击补拉，能补上该日交易
- [ ] 不同卡的覆盖度互不影响
- [ ] IMAP 连接失败时返回友好错误
