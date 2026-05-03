import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/db'

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().min(1).optional(),
  categoryId: z.string().min(1).optional(),
  priority: z.number().int().optional(),
  enabled: z.boolean().optional(),
})

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const parsed = updateSchema.safeParse(await request.json())
    if (!parsed.success) return NextResponse.json({ success: false, error: parsed.error.message }, { status: 400 })
    const rule = await prisma.rule.update({ where: { id }, data: parsed.data, include: { category: true } })
    return NextResponse.json({ success: true, data: rule })
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 })
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    await prisma.rule.delete({ where: { id } })
    return NextResponse.json({ success: true, data: null })
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 })
  }
}
