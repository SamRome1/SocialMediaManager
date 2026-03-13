import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { runAudit } from '@/lib/anthropic'
import type { Post, Settings } from '@/types'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as { platform?: string }
    const { platform } = body

    if (!platform) {
      return NextResponse.json({ error: 'platform is required' }, { status: 400 })
    }

    // Fetch last 50 posts for this platform
    const { data: posts, error: postsError } = await supabaseAdmin
      .from('posts')
      .select('*')
      .eq('platform', platform)
      .order('posted_at', { ascending: false })
      .limit(50)

    if (postsError) throw postsError
    if (!posts || posts.length === 0) {
      return NextResponse.json(
        { error: 'No posts found for this platform. Run a scrape first.' },
        { status: 404 },
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

    const auditResult = await runAudit(
      posts as Post[],
      settings as Pick<Settings, 'brand_name' | 'niche' | 'tone'>,
      platform,
    )

    // Save audit to Supabase
    const { data: savedAudit, error: saveError } = await supabaseAdmin
      .from('audits')
      .insert({
        platform,
        summary: auditResult.summary,
        action_items: auditResult.action_items,
        avg_score: auditResult.avg_score,
        top_post_id: null,
        model_used: 'claude-sonnet-4-6',
      })
      .select()
      .single()

    if (saveError) throw saveError

    return NextResponse.json({ success: true, audit: savedAudit })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('[audit] error:', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
