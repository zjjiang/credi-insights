import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/db'

export async function GET() {
  const rules = await prisma.rule.findMany({
    include: { category: true },
    orderBy: [{ priority: 'desc' }, { createdAt: 'asc' }],
  })
  return NextResponse.json({ success: true, data: rules })
}

const createSchema = z.object({
  name: z.string().min(1),
  description: z.string().min(1),
  categoryId: z.string().min(1),
  priority: z.number().int().optional(),
})

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const parsed = createSchema.safeParse(body)
    if (!parsed.success) return NextResponse.json({ success: false, error: parsed.error.message }, { status: 400 })
    const rule = await prisma.rule.create({ data: parsed.data, include: { category: true } })
    return NextResponse.json({ success: true, data: rule })
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 })
  }
}
