# 部署与日推送定时抓取

Credi Insights 的「按日」视图依赖每天从邮箱抓取 CMB 每日信用管家推送。要做到「日结」，
抓取必须每天稳定运行；否则对应自然日会被标记为「缺口」，汇总数字可能偏低。

## 环境变量

在生产环境的 `.env`（或部署平台的环境变量）中配置：

| 变量 | 说明 |
|------|------|
| `IMAP_HOST` | 邮箱 IMAP 主机，如 `imap.qq.com` |
| `IMAP_PORT` | IMAP 端口，通常 `993`（TLS） |
| `IMAP_USER` | 邮箱账号 |
| `IMAP_PASS` | 邮箱授权码（非登录密码，QQ 邮箱需在设置里生成） |
| `INGEST_SECRET` | 保护 `/api/ingest/*` 接口的密钥。**公网部署前必须设置**，否则接口无鉴权。 |
| `DATABASE_URL` | MySQL 连接串 |

> ⚠️ 未设置 `INGEST_SECRET` 时 ingest 接口默认放行，仅适合本地开发。

## 手动抓取

```bash
npm run ingest        # 从上次游标增量抓取当天日推
```

补拉某段历史（不移动游标，用于补缺口）：

```bash
curl -X POST https://<host>/api/ingest/refetch \
  -H "Content-Type: application/json" \
  -H "x-ingest-secret: $INGEST_SECRET" \
  -d '{"start":"2026-08-01","end":"2026-08-05"}'
```

或在「按日」视图里点某个「缺口」日期的「补拉」按钮。

## 定时任务（crontab）

日推一般在次日凌晨到账（T+1）。建议每天早上抓取一次：

```cron
# 每天 07:15 抓取前一天的日推（需先 cd 到项目并加载 .env）
15 7 * * * cd /srv/credi-insights && /usr/bin/npm run ingest >> /var/log/credi-ingest.log 2>&1
```

要点：

- 使用绝对路径（`cd` + npm 全路径），cron 环境不继承登录 shell 的 PATH。
- `npm run ingest` 通过 `dotenv/config` 读取项目 `.env`，无需额外注入。
- 抓取失败会以非零退出码结束并打印 `[ingest] failed: ...`，便于日志排查。
- 若某天 cron 未运行（机器关机等），对应日期会显示为缺口，可事后用补拉补齐。

## 托管平台

无常驻 cron 的平台（Vercel 等）可用其 Scheduled Functions / Cron Jobs 定时
`POST /api/ingest/daily`（带 `x-ingest-secret` 头），效果等同 `npm run ingest`。
