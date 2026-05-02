import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params
    const transactions = await prisma.transaction.findMany({
      where: { uploadId: id },
      include: { category: true },
      orderBy: { txDate: 'desc' },
    })

    return NextResponse.json({ success: true, data: transactions })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch transactions'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
