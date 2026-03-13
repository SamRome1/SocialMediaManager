import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { buildTrendsSystemPrompt, streamTrendsChat } from '@/lib/anthropic'
import type { Settings } from '@/types'

interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as { messages?: ChatMessage[] }
    const { messages } = body

    if (!messages || messages.length === 0) {
      return NextResponse.json({ error: 'messages array is required' }, { status: 400 })
    }

    // Fetch brand settings for system prompt context
    const { data: settings } = await supabaseAdmin
      .from('settings')
      .select('brand_name, niche, tone, platforms')
      .limit(1)
      .single()

    const brandContext: Pick<Settings, 'brand_name' | 'niche' | 'tone' | 'platforms'> =
      settings ?? {
        brand_name: 'Your Brand',
        niche: 'General',
        tone: 'Professional',
        platforms: [],
      }

    const systemPrompt = buildTrendsSystemPrompt(brandContext)
    const responseStream = await streamTrendsChat(messages, systemPrompt)

    return new NextResponse(responseStream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Transfer-Encoding': 'chunked',
        'Cache-Control': 'no-cache',
      },
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('[trends] error:', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
