import Anthropic from '@anthropic-ai/sdk'

interface TxInput { id: string; merchant: string; amount: number }
interface RuleInput { description: string; categoryId: string; categoryName: string }

export async function classifyTransactions(
  transactions: TxInput[],
  rules: RuleInput[],
  apiKey: string,
): Promise<{ txId: string; categoryId: string }[]> {
  if (transactions.length === 0 || rules.length === 0) return []

  const client = new Anthropic({ apiKey })

  const prompt = `根据以下分类规则，为每笔交易分配最合适的分类。

分类规则：
${rules.map((r, i) => `${i + 1}. ${r.description} → 分类ID: ${r.categoryId} (${r.categoryName})`).join('\n')}

交易列表：
${transactions.map((t) => `- ID: ${t.id} | 商户: ${t.merchant} | 金额: ¥${t.amount}`).join('\n')}

请返回 JSON 数组，格式：[{"txId": "...", "categoryId": "..."}]
只返回能匹配到规则的交易，无法匹配的不要包含在结果中。
只返回 JSON，不要其他文字。`

  const response = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 2048,
    messages: [{ role: 'user', content: prompt }],
  })

  const text = response.content[0].type === 'text' ? response.content[0].text : ''
  const match = text.match(/\[[\s\S]*\]/)
  if (!match) return []

  try {
    return JSON.parse(match[0])
  } catch {
    return []
  }
}
