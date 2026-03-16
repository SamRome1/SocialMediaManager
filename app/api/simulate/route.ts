import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { runSimulation } from '@/lib/anthropic'
import type { Post, Settings } from '@/types'

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

    const { data: posts } = await supabaseAdmin
      .from('posts')
      .select('format, reach, likes, comments, shares, content, posted_at')
      .eq('platform', platform)
      .order('posted_at', { ascending: false })
      .limit(30)

    const analysis = await runSimulation(
      platform,
      format,
      topic,
      settings as Pick<Settings, 'brand_name' | 'niche' | 'tone'>,
      (posts ?? []) as Post[],
    )

    const rows = analysis.ideas.map((idea) => ({
      platform,
      format,
      topic,
      hook: idea.hook,
      script: idea.script,
      cta: idea.cta,
      predicted_score: idea.predicted_score,
      why: idea.why,
      content_type: idea.content_type ?? '',
      is_proven: idea.is_proven ?? false,
      estimated_time: idea.estimated_time ?? '',
      views_low: idea.views_low ?? 0,
      views_high: idea.views_high ?? 0,
      eng_low: idea.eng_low ?? 0,
      eng_high: idea.eng_high ?? 0,
      followers_low: idea.followers_low ?? 0,
      followers_high: idea.followers_high ?? 0,
      signal: idea.signal ?? 'TEST',
      published: false,
    }))

    const { data: saved, error: saveError } = await supabaseAdmin
      .from('simulations')
      .insert(rows)
      .select()

    if (saveError) throw saveError

    return NextResponse.json({
      success: true,
      simulations: saved,
      model_confidence: analysis.model_confidence,
      pattern_evidence: analysis.pattern_evidence,
      playbook: analysis.playbook,
      optimal_specs: analysis.optimal_specs,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('[simulate] error:', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
