import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import type { Post, Profile } from '@/types'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as {
      timePeriod?: '1w' | '1m' | '3m' | '6m'
    }
    const { timePeriod = '1m' } = body

    // Calculate date range
    const now = new Date()
    let daysBack = 30 // default 1 month
    if (timePeriod === '1w') daysBack = 7
    else if (timePeriod === '1m') daysBack = 30
    else if (timePeriod === '3m') daysBack = 90
    else if (timePeriod === '6m') daysBack = 180

    const cutoffDate = new Date(now.getTime() - daysBack * 24 * 60 * 60 * 1000).toISOString()

    // Fetch data within time period
    const [postStatsRes, topPostsRes, profilesRes, settingsRes] = await Promise.all([
      supabaseAdmin
        .from('posts')
        .select('platform, likes, comments, shares, reach')
        .gte('posted_at', cutoffDate)
        .limit(1000),
      supabaseAdmin
        .from('posts')
        .select('id, platform, content, likes, comments, shares, reach, posted_at, format')
        .gte('posted_at', cutoffDate)
        .order('reach', { ascending: false })
        .limit(3),
      supabaseAdmin
        .from('profiles')
        .select('*')
        .order('scraped_at', { ascending: false }),
      supabaseAdmin
        .from('settings')
        .select('brand_name, niche, platforms')
        .limit(1)
        .single(),
    ])

    console.log('[dashboard] profiles found:', profilesRes.data?.length ?? 0, profilesRes.data?.map(p => `${p.platform}/${p.handle}:${p.followers}`))
    if (profilesRes.error) console.error('[dashboard] profiles error:', profilesRes.error)

    return NextResponse.json({
      postStats: postStatsRes.data ?? [],
      topPosts: (topPostsRes.data ?? []) as Post[],
      profiles: (profilesRes.data ?? []) as Profile[],
      settings: settingsRes.data,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('[dashboard] error:', message, err)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
