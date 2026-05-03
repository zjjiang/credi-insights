import { prisma } from '@/lib/db'

export async function getSetting(key: string): Promise<string | null> {
  const s = await prisma.setting.findUnique({ where: { key } })
  return s?.value ?? null
}
