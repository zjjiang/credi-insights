import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/db'

const bulkSchema = z.object({
  ids: z.array(z.string()).min(1),
  categoryId: z.string().nullable().optional(),
  purpose: z.string().nullable().optional(),
})

export async function PATCH(request: Request) {
  try {
    const body = await request.json()
    const parsed = bulkSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: parsed.error.message }, { status: 400 })
    }
    const { ids, ...data } = parsed.data
    const update: Record<string, unknown> = {}
    if (data.categoryId !== undefined) update.categoryId = data.categoryId
    if (data.purpose !== undefined) update.purpose = data.purpose

    const result = await prisma.transaction.updateMany({
      where: { id: { in: ids } },
      data: update,
    })
    return NextResponse.json({ success: true, data: { count: result.count } })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Bulk update failed'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
