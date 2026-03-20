import Anthropic from '@anthropic-ai/sdk'
import type { AnalyzeRequest, AnalyzeResponse, Recommendation } from './types.js'

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

const MODEL = 'claude-haiku-4-5-20251001'

function buildPrompt(req: AnalyzeRequest): string {
  const mealLabels: Record<string, string> = {
    breakfast: '朝食',
    lunch: '昼食',
    dinner: '夕食',
  }

  const mealLines = ['breakfast', 'lunch', 'dinner'].map((type) => {
    const meal = req.meals.find((m) => m.meal_type === type)
    const label = mealLabels[type]
    return `- ${label}: ${meal?.notes || '未記録'}`
  })

  let sleepLines = '- 睡眠データなし'
  if (req.sleep) {
    const s = req.sleep
    const hours = Math.floor(s.duration_minutes / 60)
    const mins = s.duration_minutes % 60
    sleepLines = [
      `- 睡眠時間: ${hours}時間${mins > 0 ? mins + '分' : ''}（目安: 成人7〜9時間）`,
      s.efficiency !== null ? `- 睡眠効率: ${s.efficiency}%` : null,
      s.stages_deep_minutes !== null ? `- 深い睡眠: ${s.stages_deep_minutes}分` : null,
      s.stages_rem_minutes !== null ? `- REM睡眠: ${s.stages_rem_minutes}分` : null,
      s.stages_wake_minutes !== null ? `- 覚醒: ${s.stages_wake_minutes}分` : null,
    ]
      .filter(Boolean)
      .join('\n')
  }

  return `あなたは健康アドバイザーです。以下の1日のデータを分析して、JSON形式で回答してください。

DATE: ${req.date}

【食事】
${mealLines.join('\n')}

【睡眠】
${sleepLines}

以下のJSON形式のみで回答してください（説明文不要）:
{
  "meal_score": 0から100の整数（記録がない場合は50とする）,
  "sleep_score": 0から100の整数（データなし時は50）,
  "overall_score": 0から100の整数,
  "summary": "マークダウン形式の詳細評価（日本語、3〜5文）",
  "recommendations": [
    {
      "category": "meal または sleep または lifestyle",
      "text": "具体的なアドバイス（日本語）",
      "priority": "high または medium または low"
    }
  ]
}`
}

function parseResponse(text: string): Omit<AnalyzeResponse, 'usage'> {
  // Extract JSON from response (handle markdown code blocks)
  const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/) ||
    text.match(/(\{[\s\S]*\})/)

  const jsonStr = jsonMatch ? jsonMatch[1] || jsonMatch[0] : text.trim()

  const parsed = JSON.parse(jsonStr)

  // Validate and clamp scores
  const clamp = (v: unknown, def: number): number => {
    const n = typeof v === 'number' ? v : def
    return Math.max(0, Math.min(100, Math.round(n)))
  }

  const recommendations: Recommendation[] = Array.isArray(parsed.recommendations)
    ? parsed.recommendations
        .filter(
          (r: unknown): r is Record<string, unknown> =>
            typeof r === 'object' && r !== null
        )
        .map((r: Record<string, unknown>) => ({
          category: (['meal', 'sleep', 'lifestyle'].includes(r.category as string)
            ? r.category
            : 'lifestyle') as Recommendation['category'],
          text: String(r.text || ''),
          priority: (['high', 'medium', 'low'].includes(r.priority as string)
            ? r.priority
            : 'medium') as Recommendation['priority'],
        }))
    : []

  return {
    meal_score: clamp(parsed.meal_score, 50),
    sleep_score: clamp(parsed.sleep_score, 50),
    overall_score: clamp(parsed.overall_score, 50),
    summary: String(parsed.summary || ''),
    recommendations,
  }
}

export async function analyzeHealth(req: AnalyzeRequest): Promise<AnalyzeResponse> {
  const prompt = buildPrompt(req)

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 1024,
    messages: [
      {
        role: 'user',
        content: prompt,
      },
    ],
  })

  const textBlock = response.content.find((b) => b.type === 'text')
  if (!textBlock || textBlock.type !== 'text') {
    throw new Error('No text response from Claude')
  }

  const parsed = parseResponse(textBlock.text)

  return {
    ...parsed,
    usage: {
      prompt_tokens: response.usage.input_tokens,
      completion_tokens: response.usage.output_tokens,
    },
  }
}
