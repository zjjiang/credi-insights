import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params
    const upload = await prisma.upload.findUnique({
      where: { id },
      include: { transactions: { include: { category: true } } },
    })

    if (!upload) {
      return NextResponse.json(
        { success: false, error: 'Upload not found' },
        { status: 404 },
      )
    }

    return NextResponse.json({ success: true, data: upload })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch upload'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params
    await prisma.upload.delete({ where: { id } })
    return NextResponse.json({ success: true, data: null })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to delete upload'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
