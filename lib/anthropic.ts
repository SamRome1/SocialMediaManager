import Anthropic from '@anthropic-ai/sdk'
import type { Post, AuditResult, SimulationAnalysis, MediaAnalysis, Settings } from '@/types'

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
  posts: Post[],
): Promise<SimulationAnalysis> {
  const client = getClient()

  const postsContext = posts.length > 0
    ? posts
        .slice(0, 30)
        .map(
          (p) =>
            `Format: ${p.format} | Reach: ${p.reach} | Likes: ${p.likes} | Comments: ${p.comments} | Content: ${p.content.slice(0, 200)}`,
        )
        .join('\n')
    : 'No historical post data available.'

  const prompt = `You are a viral content strategist analyzing real post performance data for a creator.

Brand: "${settings.brand_name}" | Niche: "${settings.niche}" | Tone: "${settings.tone}"
Platform: ${platform} | Format: ${format} | Topic: ${topic}

Historical post data (use this to ground ALL predictions):
${postsContext}

Generate a comprehensive content simulation. Return ONLY valid JSON matching this exact shape:

{
  "model_confidence": {
    "viral_formula_match": { "value": <0-100>, "sublabel": "<what drives this score, e.g. '3/3 viral posts used this format'>" },
    "prediction_accuracy": { "value": <0-100>, "sublabel": "<confidence basis, e.g. '12 posts with known outcomes'>" },
    "flop_risk": { "value": <0-100>, "sublabel": "<what drives risk, e.g. 'Generic AI content avg 1.7K views'>" }
  },
  "ideas": [
    {
      "hook": "<compelling content title, not a hook line — e.g. '3 Claude Code Tricks That Replace Paid Tools'>",
      "script": "<full content outline, 2-4 sentences>",
      "cta": "<specific call to action>",
      "predicted_score": <0-100>,
      "why": "<1-2 sentence explanation grounded in the data>",
      "content_type": "<one of: 3-list, Story, Hot Take, Tutorial, Compare, News, Lifestyle, Review>",
      "is_proven": <true if this content type has historically performed well based on the data>,
      "estimated_time": "<e.g. '40s', '60s', '90s', '2min'>",
      "views_low": <conservative view estimate as integer>,
      "views_high": <optimistic view estimate as integer>,
      "eng_low": <conservative engagement rate as decimal, e.g. 4.5>,
      "eng_high": <optimistic engagement rate as decimal, e.g. 6.8>,
      "followers_low": <conservative new followers estimate as integer>,
      "followers_high": <optimistic new followers estimate as integer>,
      "signal": "<POST if predicted_score >= 70, TEST if 40-69, SKIP if below 40>"
    }
  ],
  "pattern_evidence": {
    "format": [
      { "label": "<format name>", "avg_views": <integer> }
    ],
    "duration": [
      { "label": "<duration range e.g. '40-57s'>", "avg_views": <integer> }
    ],
    "topic": [
      { "label": "<topic cluster>", "avg_views": <integer> }
    ]
  },
  "playbook": {
    "always": [
      { "label": "<bold strategy label>", "detail": "<supporting data from posts, be specific with numbers>" }
    ],
    "never": [
      { "label": "<bold anti-pattern label>", "detail": "<supporting data showing why this fails, be specific>" }
    ]
  },
  "optimal_specs": {
    "duration": "<best performing duration range>",
    "items": <number of items for list posts, or null>,
    "extras": [
      { "label": "<spec name>", "value": "<optimal value>" }
    ]
  }
}

Generate exactly 7 ideas sorted by predicted_score descending. Ground every number in the historical data — if data is sparse, acknowledge that in sublabels. Include 3-5 entries in each pattern_evidence array, 4-6 playbook items per column, and 2-4 extras in optimal_specs.`

  const message = await client.messages.create({
    model: MODEL,
    max_tokens: 4096,
    messages: [{ role: 'user', content: prompt }],
  })

  const text = message.content[0].type === 'text' ? message.content[0].text : ''
  const jsonMatch = text.match(/\{[\s\S]*\}/)
  if (!jsonMatch) throw new Error('Claude did not return valid JSON')

  const analysis = JSON.parse(jsonMatch[0]) as SimulationAnalysis
  return analysis
}

// ── Media Analysis ───────────────────────────────────────────────────────────

export async function analyzeMedia(
  frames: string[],           // base64-encoded JPEG frames (1 for image, 3 for video)
  mediaType: 'image' | 'video',
  platform: string,
  format: string,
  settings: Pick<Settings, 'brand_name' | 'niche' | 'tone'>,
  posts: Post[],
): Promise<MediaAnalysis> {
  const client = getClient()

  const postContext = posts.length > 0
    ? posts
        .slice(0, 20)
        .map((p) => `Format: ${p.format} | Reach: ${p.reach} | Likes: ${p.likes} | Eng: ${p.reach > 0 ? ((p.likes + p.comments + p.shares) / p.reach * 100).toFixed(1) : 0}% | Content: ${p.content.slice(0, 120)}`)
        .join('\n')
    : 'No historical data available — use general platform benchmarks.'

  const frameNote = mediaType === 'video'
    ? `You are seeing ${frames.length} frames extracted from a video (opening, middle, end). Evaluate as a video post.`
    : 'You are analyzing a single image/photo.'

  const prompt = `You are a social media content performance analyst for expert creators.

Brand: "${settings.brand_name}" | Niche: ${settings.niche} | Tone: ${settings.tone}
Platform: ${platform} | Format: ${format}
${frameNote}

Historical performance data for this account on ${platform}:
${postContext}

Analyze this content and predict its performance. Return ONLY valid JSON:
{
  "overall_score": <0-100, holistic performance prediction>,
  "hook_strength": <0-100, how compelling the first impression is — for video: opening frame energy; for image: thumb-stopping power>,
  "visual_quality": <0-100, production quality, composition, clarity>,
  "platform_fit": <0-100, how well this matches ${platform} norms and algorithm preferences>,
  "predicted_views_low": <conservative view estimate grounded in historical data or platform benchmarks>,
  "predicted_views_high": <optimistic view estimate>,
  "predicted_engagement_low": <decimal % e.g. 3.2>,
  "predicted_engagement_high": <decimal % e.g. 6.8>,
  "summary": "<2-3 sentences: what this content does well, what holds it back, and the single most impactful change>",
  "strengths": ["<specific strength 1>", "<specific strength 2>", "<specific strength 3>"],
  "improvements": [
    { "issue": "<specific problem>", "fix": "<concrete, actionable solution>" },
    { "issue": "<specific problem>", "fix": "<concrete, actionable solution>" },
    { "issue": "<specific problem>", "fix": "<concrete, actionable solution>" }
  ],
  "reframe_suggestions": [
    "<alternative hook or angle that would perform better>",
    "<alternative hook or angle that would perform better>",
    "<alternative hook or angle that would perform better>"
  ],
  "caption_suggestions": [
    "<ready-to-use caption with hook + body + CTA>",
    "<ready-to-use caption — different style/angle>"
  ]
}

Be specific. Reference actual numbers from historical data where possible. Score ruthlessly — a 70+ should mean genuinely strong content.`

  const imageBlocks: Anthropic.ImageBlockParam[] = frames.map((data) => ({
    type: 'image',
    source: { type: 'base64', media_type: 'image/jpeg', data },
  }))

  const message = await client.messages.create({
    model: MODEL,
    max_tokens: 2048,
    messages: [{
      role: 'user',
      content: [
        ...imageBlocks,
        { type: 'text', text: prompt },
      ],
    }],
  })

  const text = message.content[0].type === 'text' ? message.content[0].text : ''
  const jsonMatch = text.match(/\{[\s\S]*\}/)
  if (!jsonMatch) throw new Error('Claude did not return valid JSON')
  return JSON.parse(jsonMatch[0]) as MediaAnalysis
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
