import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/db'

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  icon: z.string().nullable().optional(),
  color: z.string().nullable().optional(),
  sortOrder: z.number().int().optional(),
})

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params
    const category = await prisma.category.findUnique({ where: { id } })

    if (!category) {
      return NextResponse.json(
        { success: false, error: 'Category not found' },
        { status: 404 },
      )
    }

    return NextResponse.json({ success: true, data: category })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch category'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}

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

    const category = await prisma.category.update({
      where: { id },
      data: parsed.data,
    })

    return NextResponse.json({ success: true, data: category })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to update category'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params
    await prisma.category.delete({ where: { id } })
    return NextResponse.json({ success: true, data: null })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to delete category'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
