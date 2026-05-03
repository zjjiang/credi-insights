import OpenAI from 'openai'
import { getSetting } from './settings'

export async function getAiClient() {
  const apiKey = await getSetting('ANTHROPIC_API_KEY')
  if (!apiKey) throw new Error('未配置 API Key，请前往设置页面配置')
  const baseURL = (await getSetting('AI_BASE_URL')) ?? undefined
  return { client: new OpenAI({ apiKey, baseURL }), model: (await getSetting('AI_MODEL')) ?? 'qwen-plus' }
}
