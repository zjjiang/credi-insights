## Context

当前系统通过手动上传 `.msg` 月度账单获取招行信用卡交易数据。招行每日向用户邮箱发送「每日信用管家」汇总邮件,包含前一日逐笔消费明细(精确到秒)。需新增 IMAP 自动拉取通道,实现日粒度数据获取。

**邮箱接入路径**: 招行邮件发往个人 Outlook(live.cn)。live.cn 个人账户 IMAP 强制走 OAuth2、禁用基础认证且无应用密码,直连成本高。改为在 live.cn 设置转发规则:招行 → live.cn → QQ 邮箱,应用通过 QQ 邮箱的 16 位 IMAP 授权码连接(imap.qq.com:993),显著简化认证。

现有 Transaction 表以 `uploadId` 为必填外键关联月账单。日抓取的交易无对应 Upload,需解耦这一绑定关系。

## Goals / Non-Goals

**Goals:**
- IMAP 连接 QQ 邮箱拉取(经 live.cn 转发的)日汇总邮件
- 解析逐笔消费明细入库(兼容转发后的正文噪声)
- 跨源(日推送 vs 月账单)指纹去重,月账单为准
- 保留用户已打的分类标签不被覆盖
- 提供 API + CLI 两种触发方式

**Non-Goals:**
- 不做定时调度(应用侧不内建 scheduler;部署时用系统 cron 调 `npm run ingest`)
- 不存额度/积分信息
- 不做日推送独立 UI Tab(先跑通数据链路,UI 后续迭代)

## Decisions

### D0: 邮箱接入 — live.cn 转发到 QQ,而非 OAuth2 直连

**选择**: 在 live.cn 配置转发规则将招行邮件转到 QQ 邮箱,应用连 QQ(IMAP 授权码)
**替代方案**: 直连 live.cn(需 OAuth2 授权流 + token 刷新,个人账户无应用密码);Power Automate(用户有多个邮箱,不通用)
**理由**: QQ 授权码是静态凭证,连接逻辑与 `.env` 配置最简单;OAuth2 需注册 Azure 应用、维护刷新 token,对单用户自托管过重。
**代价**: 转发会改写 FROM、加「转发:/Fwd:」主题前缀,并在纯文本正文的字段间插入图片 URL 行 — 解析与搜索逻辑需相应容错(见 D6)。

### D1: IMAP 库选择 — imapflow

**选择**: `imapflow`
**替代方案**: `node-imap`(老旧,callback 风格)、`imap-simple`(封装浅)
**理由**: Promise 原生、活跃维护(2024+)、支持 IDLE/UTF-8、配套 `mailparser` 解析 MIME

### D2: 指纹设计 — date + cardLast4 + amount

**格式**: `"2026-07-25_0094_28.00"`
**替代方案**: 加 merchant 模糊匹配(跨源商户名不一致会导致匹配失败)、加时间戳(月账单无时间)
**理由**: 同日同卡同额碰撞概率极低(精确到分);商户名跨源截断方式不同不可靠;时间戳月账单不提供。接受极小概率碰撞换取确定性匹配。

### D3: 合并策略 — 月账单为准,标签不动

**规则**:
1. 日推送先到 → 正常插入(source="daily")
2. 月账单后到,fingerprint 命中 → 覆盖 merchant/txStatus/uploadId/source,不动 categoryId
3. 日推送后到,fingerprint 命中 → 跳过

**理由**: 月账单是银行结算后的正式数据;标签是用户劳动成果,覆盖会导致返工。

### D4: uploadId 可选化

**变更**: `uploadId String?`(nullable)
**影响**: 现有月账单流程不受影响(仍填 uploadId);日抓取交易 uploadId=null
**Dashboard 查询**: 按 uploadId 过滤的查询需兼容 null 情况(日推送交易不出现在月账单看板)

### D5: 游标存储 — Setting 表

**存储位置**: Setting 表 key=`imap_last_uid`
**理由**: 复用现有 Setting 模型,无需新表;单值,简单可靠。

### D6: 转发容错 — 主题过滤 + 前向扫描解析

**搜索**: 只按 `subject: 每日信用管家` 过滤,不按 FROM(转发后发件人变为转发者)。
**解析**: `tryParseBlock` 从时间行起用 `LOOKAHEAD` 窗口向前扫描金额行、明细行,跳过转发插入的图片 URL 等噪声行;扫描中遇到下一条时间行则中止,避免跨交易错配。
**理由**: 转发链路会改写头部与正文结构,严格按相邻行/发件人匹配会漏掉全部交易。

## Risks / Trade-offs

- **[指纹碰撞]** 同日同卡完全相同金额 → 少记一笔。概率极低,最坏结果可接受。
- **[转发依赖]** 依赖 live.cn 转发规则持续生效;若转发中断则 QQ 收不到邮件,游标不前进但无数据丢失(招行邮件仍在 live.cn)。
- **[邮件格式变化]** 招行改版邮件模板 → 解析器失败,需人工介入修复。日志记录原始 HTML 便于排查。
- **[年份硬编码]** 现有 parse_msg.py 硬编码 2026,但日推送自带完整日期(YYYY/MM/DD)不受影响。

## Migration Plan

1. 运行 Prisma migration:Transaction 新增 fingerprint/txTime/source 字段,uploadId 改 nullable
2. 为现有数据回填 fingerprint(基于 txDate + cardLast4 + amount)
3. 部署新代码
4. 用户在 live.cn 配置转发规则(招行 → QQ),并在 `.env` 配置 QQ IMAP 凭证
5. 手动触发 `POST /api/ingest/daily`(或 `npm run ingest`)验证

回滚:revert migration(fingerprint/txTime/source 字段可安全删除,uploadId nullable 不影响现有数据)
