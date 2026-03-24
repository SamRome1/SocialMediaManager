import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { buildTrendsSystemPrompt, streamTrendsChat } from '@/lib/anthropic'
import type { Settings } from '@/types'

interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await request.json() as { messages?: ChatMessage[] }
    const { messages } = body
    if (!messages?.length) {
      return NextResponse.json({ error: 'messages array is required' }, { status: 400 })
    }

    const { data: settings } = await supabase
      .from('settings')
      .select('brand_name, niche, tone, platforms')
      .eq('user_id', user.id)
      .single()

    const brandContext: Pick<Settings, 'brand_name' | 'niche' | 'tone' | 'platforms'> =
      settings ?? { brand_name: 'Your Brand', niche: 'General', tone: 'Professional', platforms: [] }

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
    console.error('[trends] error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
