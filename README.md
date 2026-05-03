# Credi Insights

招商银行信用卡账单分析工具。上传电子账单邮件，自动解析交易明细，AI 智能分类，按账单周期查看消费统计。

## 功能

- **账单解析**：上传招商银行信用卡电子账单（`.msg` 格式），自动提取账期、还款日、每笔交易
- **AI 自动分类**：配置自然语言规则（如"包含星巴克 → 咖啡"），上传时 AI 自动打标
- **消费统计**：每份账单独立统计，支出/收入汇总 + 分类饼图
- **批量编辑**：勾选多笔交易批量修改分类；或在 AI 对话框里说"把所有外卖改成餐饮"
- **AI 对话**：右下角聊天按钮，可以问"本期花了多少"、"哪类支出最多"等问题

## 快速开始

**环境要求：** Node.js 18+、MySQL、Python 3.10+

```bash
# 1. 安装依赖
npm install
python3 -m venv .venv && .venv/bin/pip install -r scripts/requirements.txt

# 2. 配置环境变量
# DATABASE_URL=mysql://root:pass@localhost:3306/credi_insights
# PYTHON_BIN=/path/to/project/.venv/bin/python3

# 3. 初始化数据库
npm run db:migrate

# 4. 启动
npm run dev
```

访问 http://localhost:3000，在设置页填入 Anthropic API Key 后 AI 功能即可使用。

## 如何获取 .msg 账单

招商银行每月会将账单以邮件形式发送。在 Outlook 等邮件客户端中将该邮件另存为 `.msg` 格式，即可上传。

## 技术栈

Next.js 16 · MySQL · Prisma 6 · Python extract-msg · Anthropic Claude Haiku · Tailwind CSS v4 · Recharts
