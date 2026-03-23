import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import type { Post, Profile } from '@/types'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await request.json() as { timePeriod?: '1w' | '1m' | '3m' | '6m' }
    const { timePeriod = '1m' } = body

    const daysBack = { '1w': 7, '1m': 30, '3m': 90, '6m': 180 }[timePeriod]
    const cutoffDate = new Date(Date.now() - daysBack * 24 * 60 * 60 * 1000).toISOString()

    const [rawPostsRes, topPostsRes, profilesRes, settingsRes] = await Promise.all([
      supabase
        .from('posts')
        .select('platform, posted_at, likes, comments, shares, reach')
        .eq('user_id', user.id)
        .gte('posted_at', cutoffDate)
        .order('posted_at', { ascending: true })
        .limit(2000),
      supabase
        .from('posts')
        .select('id, platform, content, likes, comments, shares, reach, posted_at, format')
        .eq('user_id', user.id)
        .gte('posted_at', cutoffDate)
        .order('reach', { ascending: false })
        .limit(3),
      supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .order('scraped_at', { ascending: false }),
      supabase
        .from('settings')
        .select('brand_name, niche, platforms')
        .eq('user_id', user.id)
        .single(),
    ])

    return NextResponse.json({
      rawPosts: rawPostsRes.data ?? [],
      topPosts: (topPostsRes.data ?? []) as Post[],
      profiles: (profilesRes.data ?? []) as Profile[],
      settings: settingsRes.data,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('[dashboard] error:', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
