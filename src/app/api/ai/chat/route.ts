import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { prisma } from '@/lib/db'
import { getSetting } from '@/lib/settings'

async function getClient() {
  const apiKey = (await getSetting('ANTHROPIC_API_KEY')) ?? process.env.ANTHROPIC_API_KEY
  if (!apiKey) throw new Error('未配置 Anthropic API Key，请前往设置页面配置')
  return new Anthropic({ apiKey })
}

const tools: Anthropic.Tool[] = [
  {
    name: 'query_transactions',
    description: '查询交易数据用于回答问题',
    input_schema: {
      type: 'object' as const,
      properties: {
        month: { type: 'string', description: 'YYYY-MM 格式' },
        merchantContains: { type: 'string' },
        type: { type: 'string', enum: ['DEBIT', 'CREDIT'] },
        limit: { type: 'number' },
      },
    },
  },
  {
    name: 'bulk_update_category',
    description: '批量修改符合条件的交易分类或用途',
    input_schema: {
      type: 'object' as const,
      properties: {
        filter: {
          type: 'object',
          properties: {
            merchantContains: { type: 'string' },
            month: { type: 'string' },
            categoryId: { type: 'string' },
          },
        },
        update: {
          type: 'object',
          properties: {
            categoryId: { type: 'string' },
            purpose: { type: 'string' },
          },
        },
      },
      required: ['filter', 'update'],
    },
  },
]

async function runTool(name: string, input: Record<string, unknown>): Promise<unknown> {
  if (name === 'query_transactions') {
    const where: Record<string, unknown> = {}
    if (input.month) {
      const [y, m] = (input.month as string).split('-').map(Number)
      where.txDate = { gte: new Date(y, m - 1, 1), lt: new Date(y, m, 1) }
    }
    if (input.merchantContains) where.merchant = { contains: input.merchantContains as string }
    if (input.type) where.type = input.type
    const txs = await prisma.transaction.findMany({
      where,
      include: { category: true },
      orderBy: { txDate: 'desc' },
      take: (input.limit as number) ?? 50,
    })
    return txs.map((t) => ({
      id: t.id,
      date: t.txDate.toISOString().slice(0, 10),
      merchant: t.merchant,
      amount: Number(t.amount),
      type: t.type,
      category: t.category?.name ?? '未分类',
    }))
  }

  if (name === 'bulk_update_category') {
    const filter = input.filter as Record<string, unknown>
    const update = input.update as Record<string, unknown>
    const where: Record<string, unknown> = {}
    if (filter.merchantContains) where.merchant = { contains: filter.merchantContains as string }
    if (filter.month) {
      const [y, m] = (filter.month as string).split('-').map(Number)
      where.txDate = { gte: new Date(y, m - 1, 1), lt: new Date(y, m, 1) }
    }
    if (filter.categoryId) where.categoryId = filter.categoryId
    const data: Record<string, unknown> = {}
    if (update.categoryId !== undefined) data.categoryId = update.categoryId
    if (update.purpose !== undefined) data.purpose = update.purpose
    const result = await prisma.transaction.updateMany({ where, data })
    return { affected: result.count }
  }

  return { error: 'unknown tool' }
}

export async function POST(request: Request) {
  try {
    const { messages, context } = await request.json()

    const systemPrompt = `你是一个信用卡账单分析助手。你可以查询交易数据、回答消费问题、批量修改交易分类。${
      context?.currentMonth ? `当前查看的月份是 ${context.currentMonth}。` : ''
    }回答简洁，数字保留两位小数。`

    const stream = new ReadableStream({
      async start(controller) {
        const enc = new TextEncoder()
        const send = (data: unknown) => controller.enqueue(enc.encode(`data: ${JSON.stringify(data)}\n\n`))

        let msgs: Anthropic.MessageParam[] = messages

        // agentic loop
        const client = await getClient()
        for (let i = 0; i < 5; i++) {
          const response = await client.messages.create({
            model: 'claude-haiku-4-5-20251001',
            max_tokens: 1024,
            system: systemPrompt,
            tools,
            messages: msgs,
            stream: false,
          })

          for (const block of response.content) {
            if (block.type === 'text') {
              send({ type: 'text', delta: block.text })
            } else if (block.type === 'tool_use') {
              const toolResult = await runTool(block.name, block.input as Record<string, unknown>)
              send({ type: 'tool_result', name: block.name, result: toolResult })
              msgs = [
                ...msgs,
                { role: 'assistant', content: response.content },
                { role: 'user', content: [{ type: 'tool_result', tool_use_id: block.id, content: JSON.stringify(toolResult) }] },
              ]
            }
          }

          if (response.stop_reason !== 'tool_use') break
        }

        send('[DONE]')
        controller.close()
      },
    })

    return new Response(stream, {
      headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache' },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'AI chat failed'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
