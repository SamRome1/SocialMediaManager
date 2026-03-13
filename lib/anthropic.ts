import Anthropic from '@anthropic-ai/sdk'
import type { Post, AuditResult, SimulationIdea, Settings } from '@/types'

const MODEL = 'claude-sonnet-4-6'

function getClient(): Anthropic {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY is not set')
  return new Anthropic({ apiKey })
}

// ── Audit ────────────────────────────────────────────────────────────────────

export async function runAudit(
  posts: Post[],
  settings: Pick<Settings, 'brand_name' | 'niche' | 'tone'>,
  platform: string,
): Promise<AuditResult> {
  const client = getClient()

  const postsText = posts
    .map(
      (p, i) =>
        `[${i + 1}] Format: ${p.format} | Likes: ${p.likes} | Comments: ${p.comments} | Shares: ${p.shares} | Reach: ${p.reach}\nContent: ${p.content.slice(0, 300)}`,
    )
    .join('\n\n')

  const prompt = `You are an expert social media strategist. Analyze the following ${platform} posts for the brand "${settings.brand_name}" in the "${settings.niche}" niche with a "${settings.tone}" tone.

POSTS (last ${posts.length}):
${postsText}

Return ONLY valid JSON with this exact shape:
{
  "summary": "2-3 sentence overview of overall performance and patterns",
  "action_items": ["actionable recommendation 1", "actionable recommendation 2", "actionable recommendation 3", "actionable recommendation 4", "actionable recommendation 5"],
  "top_performing_format": "the format with highest average engagement",
  "avg_score": <number 0-100 representing overall channel health>
}`

  const message = await client.messages.create({
    model: MODEL,
    max_tokens: 1024,
    messages: [{ role: 'user', content: prompt }],
  })

  const text = message.content[0].type === 'text' ? message.content[0].text : ''
  const jsonMatch = text.match(/\{[\s\S]*\}/)
  if (!jsonMatch) throw new Error('Claude did not return valid JSON')

  const result = JSON.parse(jsonMatch[0]) as AuditResult
  return result
}

// ── Simulate ─────────────────────────────────────────────────────────────────

export async function runSimulation(
  platform: string,
  format: string,
  topic: string,
  settings: Pick<Settings, 'brand_name' | 'niche' | 'tone'>,
): Promise<SimulationIdea[]> {
  const client = getClient()

  const prompt = `You are a viral content strategist. Generate 5 content ideas for the brand "${settings.brand_name}" in the "${settings.niche}" niche with a "${settings.tone}" tone.

Platform: ${platform}
Format: ${format}
Topic: ${topic}

Return ONLY a valid JSON array with exactly 5 objects, each with this shape:
{
  "hook": "attention-grabbing opening line or visual description",
  "script": "full content outline or script (2-4 sentences)",
  "cta": "specific call to action",
  "predicted_score": <number 0-100>,
  "why": "1-2 sentence explanation of why this will perform well"
}`

  const message = await client.messages.create({
    model: MODEL,
    max_tokens: 2048,
    messages: [{ role: 'user', content: prompt }],
  })

  const text = message.content[0].type === 'text' ? message.content[0].text : ''
  const jsonMatch = text.match(/\[[\s\S]*\]/)
  if (!jsonMatch) throw new Error('Claude did not return valid JSON array')

  const ideas = JSON.parse(jsonMatch[0]) as SimulationIdea[]
  return ideas
}

// ── Trends (streaming) ───────────────────────────────────────────────────────

export function buildTrendsSystemPrompt(
  settings: Pick<Settings, 'brand_name' | 'niche' | 'tone' | 'platforms'>,
): string {
  return `You are a social media trends analyst and strategist for the brand "${settings.brand_name}".

Brand niche: ${settings.niche}
Brand tone: ${settings.tone}
Active platforms: ${settings.platforms.join(', ')}

Your role is to:
- Identify and explain social media trends relevant to this brand
- Suggest how to capitalize on emerging content trends
- Provide platform-specific tactical advice
- Analyze what's working in the ${settings.niche} space right now

Be specific, data-driven where possible, and always tie insights back to the brand's niche and tone.`
}

export async function streamTrendsChat(
  messages: Array<{ role: 'user' | 'assistant'; content: string }>,
  systemPrompt: string,
): Promise<ReadableStream<Uint8Array>> {
  const client = getClient()

  const encoder = new TextEncoder()

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const response = await client.messages.create({
        model: MODEL,
        max_tokens: 2048,
        system: systemPrompt,
        messages,
        stream: true,
      })

      for await (const event of response) {
        if (
          event.type === 'content_block_delta' &&
          event.delta.type === 'text_delta'
        ) {
          controller.enqueue(encoder.encode(event.delta.text))
        }
      }

      controller.close()
    },
  })

  return stream
}
