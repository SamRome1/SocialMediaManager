import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { runAudit } from '@/lib/anthropic'
import type { Post, Settings } from '@/types'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await request.json() as { platform?: string }
    const { platform } = body
    if (!platform) return NextResponse.json({ error: 'platform is required' }, { status: 400 })

    const [postsRes, settingsRes] = await Promise.all([
      supabase
        .from('posts')
        .select('*')
        .eq('user_id', user.id)
        .eq('platform', platform)
        .order('posted_at', { ascending: false })
        .limit(50),
      supabase
        .from('settings')
        .select('brand_name, niche, tone')
        .eq('user_id', user.id)
        .single(),
    ])

    if (postsRes.error) throw postsRes.error
    if (!postsRes.data?.length) {
      return NextResponse.json({ error: 'No posts found for this platform. Run a scrape first.' }, { status: 404 })
    }
    if (settingsRes.error || !settingsRes.data) {
      return NextResponse.json({ error: 'Settings not configured. Please set up your brand in Settings.' }, { status: 404 })
    }

    const auditResult = await runAudit(
      postsRes.data as Post[],
      settingsRes.data as Pick<Settings, 'brand_name' | 'niche' | 'tone'>,
      platform,
    )

    const { data: savedAudit, error: saveError } = await supabase
      .from('audits')
      .insert({
        user_id: user.id,
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
