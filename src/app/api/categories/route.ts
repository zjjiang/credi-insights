import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/db'

const createSchema = z.object({
  name: z.string().min(1),
  icon: z.string().optional(),
  color: z.string().optional(),
  sortOrder: z.number().int().optional(),
})

export async function GET() {
  try {
    const categories = await prisma.category.findMany({
      orderBy: { sortOrder: 'asc' },
    })
    return NextResponse.json({ success: true, data: categories })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch categories'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const parsed = createSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.message },
        { status: 400 },
      )
    }

    const category = await prisma.category.create({ data: parsed.data })
    return NextResponse.json({ success: true, data: category }, { status: 201 })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create category'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
