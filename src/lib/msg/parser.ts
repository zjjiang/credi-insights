import { spawn } from 'child_process'
import path from 'path'

export interface MsgTransaction {
  txDate: string
  merchant: string
  amount: number
  currency: string
  type: 'DEBIT' | 'CREDIT'
  cardLast4?: string
  txStatus?: string
}

export interface MsgParseResult {
  imageMonth?: string
  billingStart?: string
  billingEnd?: string
  dueDate?: string
  cardLast4?: string
  rawText: string
  transactions: MsgTransaction[]
}

export function parseMsgFile(filePath: string): Promise<MsgParseResult> {
  return new Promise((resolve, reject) => {
    const python = process.env.PYTHON_BIN ?? 'python3'
    const script = path.join(process.cwd(), 'scripts/parse_msg.py')
    const proc = spawn(python, [script, '--file', filePath])
    let stdout = ''
    let stderr = ''
    proc.stdout.on('data', (d: Buffer) => { stdout += d.toString() })
    proc.stderr.on('data', (d: Buffer) => { stderr += d.toString() })
    proc.on('close', (code) => {
      if (code !== 0) return reject(new Error(stderr || `parse_msg.py exited with code ${code}`))
      try { resolve(JSON.parse(stdout)) }
      catch { reject(new Error('Invalid JSON from parse_msg.py')) }
    })
  })
}
