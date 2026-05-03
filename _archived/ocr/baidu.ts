import type { OcrAdapter, OcrResult } from './types'
import { parseOcrResult } from './parser'

interface BaiduTokenResponse {
  access_token: string
  expires_in: number
}

interface BaiduOcrWord {
  words: string
}

interface BaiduOcrResponse {
  words_result: BaiduOcrWord[]
  words_result_num: number
  error_code?: number
  error_msg?: string
}

async function getAccessToken(apiKey: string, secretKey: string): Promise<string> {
  const url =
    `https://aip.baidubce.com/oauth/2.0/token` +
    `?grant_type=client_credentials&client_id=${apiKey}&client_secret=${secretKey}`
  const res = await fetch(url, { method: 'POST' })
  if (!res.ok) {
    throw new Error(`Baidu auth failed: ${res.status}`)
  }
  const data: BaiduTokenResponse = await res.json()
  if (!data.access_token) {
    throw new Error('Baidu auth: no access_token in response')
  }
  return data.access_token
}

async function callGeneralOcr(imageBase64: string, accessToken: string): Promise<string> {
  const url = `https://aip.baidubce.com/rest/2.0/ocr/v1/general_basic?access_token=${accessToken}`
  const body = new URLSearchParams({ image: imageBase64 })
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  })
  if (!res.ok) {
    throw new Error(`Baidu OCR HTTP error: ${res.status}`)
  }
  const data: BaiduOcrResponse = await res.json()
  if (data.error_code) {
    throw new Error(`Baidu OCR error ${data.error_code}: ${data.error_msg}`)
  }
  return (data.words_result ?? []).map((w) => w.words).join('\n')
}

export class BaiduOcrAdapter implements OcrAdapter {
  private readonly apiKey: string
  private readonly secretKey: string

  constructor(apiKey: string, secretKey: string) {
    this.apiKey = apiKey
    this.secretKey = secretKey
  }

  async recognize(imagePath: string): Promise<OcrResult> {
    const { readFile } = await import('fs/promises')
    const buffer = await readFile(imagePath)
    const imageBase64 = buffer.toString('base64')

    const accessToken = await getAccessToken(this.apiKey, this.secretKey)
    const rawText = await callGeneralOcr(imageBase64, accessToken)

    const imageMonthMatch = rawText.match(/(\d{4})年(\d{1,2})月/)
    const imageMonth = imageMonthMatch
      ? `${imageMonthMatch[1]}-${String(imageMonthMatch[2]).padStart(2, '0')}`
      : undefined

    return parseOcrResult(rawText, imageMonth)
  }
}
