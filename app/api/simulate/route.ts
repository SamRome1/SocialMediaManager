import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { runSimulation } from '@/lib/anthropic'
import type { Settings } from '@/types'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as {
      platform?: string
      format?: string
      topic?: string
    }
    const { platform, format, topic } = body

    if (!platform || !format || !topic) {
      return NextResponse.json(
        { error: 'platform, format, and topic are required' },
        { status: 400 },
      )
    }

    // Fetch brand settings
    const { data: settings, error: settingsError } = await supabaseAdmin
      .from('settings')
      .select('brand_name, niche, tone')
      .limit(1)
      .single()

    if (settingsError || !settings) {
      return NextResponse.json(
        { error: 'Settings not configured. Please set up your brand in Settings.' },
        { status: 404 },
      )
    }

    const ideas = await runSimulation(
      platform,
      format,
      topic,
      settings as Pick<Settings, 'brand_name' | 'niche' | 'tone'>,
    )

    // Persist simulations to Supabase
    const rows = ideas.map((idea) => ({
      platform,
      format,
      topic,
      hook: idea.hook,
      script: idea.script,
      cta: idea.cta,
      predicted_score: idea.predicted_score,
      why: idea.why,
      published: false,
    }))

    const { data: saved, error: saveError } = await supabaseAdmin
      .from('simulations')
      .insert(rows)
      .select()

    if (saveError) throw saveError

    return NextResponse.json({ success: true, simulations: saved })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('[simulate] error:', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
