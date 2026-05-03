import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/db'

const updateSchema = z.object({
  merchant: z.string().min(1).optional(),
  amount: z.number().positive().optional(),
  categoryId: z.string().nullable().optional(),
  purpose: z.string().nullable().optional(),
  note: z.string().nullable().optional(),
  type: z.enum(['DEBIT', 'CREDIT']).optional(),
  txStatus: z.string().nullable().optional(),
  txDate: z.string().optional(),
  currency: z.string().optional(),
})

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params
    const body = await request.json()
    const parsed = updateSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.message },
        { status: 400 },
      )
    }

    const transaction = await prisma.transaction.update({
      where: { id },
      data: parsed.data,
      include: { category: true },
    })

    return NextResponse.json({ success: true, data: transaction })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to update transaction'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params
    await prisma.transaction.delete({ where: { id } })
    return NextResponse.json({ success: true, data: null })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to delete transaction'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
