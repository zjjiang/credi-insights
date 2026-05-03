import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET() {
  const settings = await prisma.setting.findMany()
  const data: Record<string, string> = {}
  for (const s of settings) {
    // mask API keys in response
    data[s.key] = s.key.includes('KEY') || s.key.includes('TOKEN')
      ? s.value ? '••••••••' + s.value.slice(-4) : ''
      : s.value
  }
  return NextResponse.json({ success: true, data })
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    for (const [key, value] of Object.entries(body)) {
      if (typeof value !== 'string') continue
      await prisma.setting.upsert({
        where: { key },
        update: { value },
        create: { key, value },
      })
    }
    return NextResponse.json({ success: true })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to save settings'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
