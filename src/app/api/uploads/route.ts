import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { processAndSaveImage } from '@/lib/image'
import { getOcrAdapter } from '@/lib/ocr/adapter'

export async function POST(request: Request) {
  try {
    const formData = await request.formData()
    const file = formData.get('image')

    if (!file || !(file instanceof Blob)) {
      return NextResponse.json(
        { success: false, error: 'Missing image field' },
        { status: 400 },
      )
    }

    const originalName =
      file instanceof File ? file.name : `upload-${Date.now()}.jpg`
    const buffer = Buffer.from(await file.arrayBuffer())

    const upload = await prisma.upload.create({
      data: { originalName, imagePath: '', status: 'PROCESSING' },
    })

    let imagePath: string
    try {
      imagePath = await processAndSaveImage(buffer, originalName)
    } catch (err) {
      await prisma.upload.update({
        where: { id: upload.id },
        data: { status: 'FAILED' },
      })
      throw err
    }

    await prisma.upload.update({
      where: { id: upload.id },
      data: { imagePath },
    })

    const adapter = getOcrAdapter()
    const ocrResult = await adapter.recognize(imagePath)

    await prisma.transaction.createMany({
      data: ocrResult.transactions.map((t) => ({
        uploadId: upload.id,
        txDate: t.txDate,
        merchant: t.merchant,
        amount: t.amount,
        currency: t.currency,
        type: t.type,
        cardLast4: t.cardLast4 ?? ocrResult.cardLast4,
        txStatus: t.txStatus,
      })),
    })

    await prisma.upload.update({
      where: { id: upload.id },
      data: {
        status: 'DONE',
        imageMonth: ocrResult.imageMonth,
        cardLast4: ocrResult.cardLast4,
        txCount: ocrResult.transactions.length,
        ocrRawResult: ocrResult.rawText,
      },
    })

    return NextResponse.json({ success: true, data: { uploadId: upload.id } })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Upload failed'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}

export async function GET() {
  try {
    const uploads = await prisma.upload.findMany({
      orderBy: { createdAt: 'desc' },
    })
    return NextResponse.json({ success: true, data: uploads })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch uploads'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
