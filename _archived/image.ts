import sharp from 'sharp'
import path from 'path'
import fs from 'fs/promises'

const MAX_DIMENSION = 1920
const UPLOAD_DIR = process.env.UPLOAD_DIR ?? './data/uploads'

export async function processAndSaveImage(
  buffer: Buffer,
  originalName: string,
): Promise<string> {
  await fs.mkdir(UPLOAD_DIR, { recursive: true })

  const ext = path.extname(originalName)
  const baseName = path.basename(originalName, ext)
  const fileName = `${baseName}-${Date.now()}.jpg`
  const filePath = path.join(UPLOAD_DIR, fileName)

  await sharp(buffer)
    .resize(MAX_DIMENSION, MAX_DIMENSION, { fit: 'inside', withoutEnlargement: true })
    .jpeg({ quality: 85 })
    .toFile(filePath)

  return filePath
}
