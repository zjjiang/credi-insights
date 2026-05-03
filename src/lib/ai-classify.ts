import { getAiClient } from './ai-client'

interface TxInput { id: string; merchant: string; amount: number }
interface RuleInput { description: string; categoryId: string; categoryName: string }

const BATCH_SIZE = 20

async function classifyBatch(
  transactions: TxInput[],
  rules: RuleInput[],
  client: Awaited<ReturnType<typeof getAiClient>>['client'],
  model: string,
): Promise<{ txId: string; categoryId: string }[]> {
  const prompt = `根据以下分类规则，为每笔交易分配最合适的分类。

分类规则：
${rules.map((r, i) => `${i + 1}. ${r.description} → 分类ID: ${r.categoryId} (${r.categoryName})`).join('\n')}

交易列表：
${transactions.map((t) => `- ID: ${t.id} | 商户: ${t.merchant}`).join('\n')}

请返回 JSON 数组，格式：[{"txId": "...", "categoryId": "..."}]
只返回能匹配到规则的交易，无法匹配的不要包含在结果中。
只返回 JSON，不要其他文字。`

  const response = await client.chat.completions.create({
    model,
    max_tokens: 1024,
    messages: [{ role: 'user', content: prompt }],
  })

  const text = response.choices[0]?.message?.content ?? ''
  const match = text.match(/\[[\s\S]*\]/)
  if (!match) return []
  try { return JSON.parse(match[0]) } catch { return [] }
}

export async function classifyTransactions(
  transactions: TxInput[],
  rules: RuleInput[],
): Promise<{ txId: string; categoryId: string }[]> {
  if (transactions.length === 0 || rules.length === 0) return []

  const { client, model } = await getAiClient()
  const results: { txId: string; categoryId: string }[] = []

  const batches: TxInput[][] = []
  for (let i = 0; i < transactions.length; i += BATCH_SIZE) {
    batches.push(transactions.slice(i, i + BATCH_SIZE))
  }

  const CONCURRENCY = 5
  for (let i = 0; i < batches.length; i += CONCURRENCY) {
    const chunk = batches.slice(i, i + CONCURRENCY)
    const chunkResults = await Promise.all(chunk.map((b) => classifyBatch(b, rules, client, model)))
    for (const r of chunkResults) results.push(...r)
  }

  return results
}
