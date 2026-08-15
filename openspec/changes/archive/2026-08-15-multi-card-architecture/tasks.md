# Implementation Tasks: multi-card-architecture

## 1. Schema 迁移（数据层）

- [x] 1.1 创建 Card 表迁移（id, cardLast4, bankName, alias, billingDay, dueDay, imapConfig JSON, isActive, createdAt）
- [x] 1.2 Transaction 表添加 cardId 外键（可空，向后兼容）
- [x] 1.3 Upload 表添加 cardId 外键（可空，向后兼容）
- [x] 1.4 Setting 表改造：将 `daily_covered_dates` 从全局单键改为 `daily_covered_dates:{cardId}` 多键模式
- [x] 1.5 运行迁移，验证表结构

## 2. Card CRUD API

- [x] 2.1 POST /api/cards — 创建卡片（含 IMAP 配置 JSON 验证）
- [x] 2.2 GET /api/cards — 列出所有激活卡片
- [x] 2.3 GET /api/cards/[id] — 查询单张卡片详情
- [x] 2.4 PATCH /api/cards/[id] — 更新卡片（别名、账单日、IMAP 配置）
- [x] 2.5 DELETE /api/cards/[id] — 软删除（isActive = false）

## 3. 卡级 IMAP 同步

- [x] 3.1 重构 ingest 逻辑：接受 cardId 参数，从 Card 表读 IMAP 配置
- [x] 3.2 POST /api/cards/[id]/sync — 手动触发该卡的日推同步
- [x] 3.3 覆盖度写入改为 `daily_covered_dates:{cardId}` 键
- [x] 3.4 补拉接口 POST /api/ingest/refetch 增加 cardId 参数

## 4. 上传账单关联卡片

- [x] 4.1 POST /api/uploads 改造：解析卡号后查询 Card 表，若不存在返回 400
- [x] 4.2 Upload 记录关联 cardId
- [x] 4.3 交易写入时绑定 cardId（指纹去重时同时匹配 cardId）

## 5. 卡片交易视图

- [x] 5.1 GET /api/cards/[id]/transactions — 按日分组、倒序，复用 by-day 逻辑
- [x] 5.2 前端：卡片详情页显示交易流水（复用 DailyView 组件逻辑）
- [x] 5.3 覆盖度查询改为读 `daily_covered_dates:{cardId}`

## 6. 首页改造

- [x] 6.1 首页改为卡片列表视图（每张卡一个卡片，显示本月累计、账单日）
- [x] 6.2 点击卡片进入详情页（/cards/[id]）
- [x] 6.3 「+ 新增卡片」浮动按钮

## 7. 数据迁移脚本

- [x] 7.1 迁移脚本：将现有全局 `daily_covered_dates` 拆分到默认卡片
- [x] 7.2 为现有交易推断并绑定 cardId（基于 cardLast4）
- [x] 7.3 为现有上传推断并绑定 cardId

## 8. 向后兼容

- [x] 8.1 保留 POST /api/ingest/daily（使用默认 cardId 或报错提示升级）
- [x] 8.2 保留旧的全局 `daily_covered_dates` 读取逻辑（降级兼容）

## 9. 验证

- [x] 9.1 TDD：Card CRUD 单测全绿
- [x] 9.2 TDD：卡级 ingest 单测全绿
- [x] 9.3 集成：多卡场景下覆盖度互不干扰
- [x] 9.4 集成：上传账单正确关联卡片
- [x] 9.5 build + lint 通过
