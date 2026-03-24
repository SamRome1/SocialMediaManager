import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { runSimulation } from '@/lib/anthropic'
import type { Post, Settings } from '@/types'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await request.json() as {
      platform?: string
      format?: string
      topic?: string
      auto?: boolean
      timePeriod?: '1w' | '1m' | '3m' | '6m'
    }
    const { platform, format, topic, auto, timePeriod = '1m' } = body

    const { data: settings, error: settingsError } = await supabase
      .from('settings')
      .select('brand_name, niche, tone')
      .eq('user_id', user.id)
      .single()

    if (settingsError || !settings) {
      return NextResponse.json({ error: 'Settings not configured. Please set up your brand in Settings.' }, { status: 404 })
    }

    let selectedPlatform = platform
    let selectedFormat = format
    let selectedTopic = topic

    const needsDerive = auto || !selectedPlatform || !selectedFormat || !selectedTopic
    if (needsDerive) {
      const daysBack = { '1w': 7, '1m': 30, '3m': 90, '6m': 180 }[timePeriod]
      const cutoffDate = new Date(Date.now() - daysBack * 24 * 60 * 60 * 1000).toISOString()

      const postsQuery = supabase
        .from('posts')
        .select('platform, format, content, reach, posted_at')
        .eq('user_id', user.id)
        .gte('posted_at', cutoffDate)
        .order('reach', { ascending: false })
        .limit(100)

      if (selectedPlatform) postsQuery.eq('platform', selectedPlatform)

      const { data: allPosts } = await postsQuery

      if (!allPosts?.length) {
        return NextResponse.json({ error: 'No posts found. Please scrape your social media first.' }, { status: 400 })
      }

      type PostRow = { platform: string; format: string; content: string; reach: number }
      const rows = allPosts as PostRow[]

      if (!selectedPlatform) {
        const counts: Record<string, number> = {}
        for (const p of rows) counts[p.platform] = (counts[p.platform] ?? 0) + 1
        selectedPlatform = Object.entries(counts).sort(([, a], [, b]) => b - a)[0]?.[0] ?? 'instagram'
      }

      const platformPosts = rows.filter((p) => p.platform === selectedPlatform)

      if (!selectedFormat) {
        const formatStats: Record<string, { count: number; totalReach: number; avgReach: number }> = {}
        for (const p of platformPosts) {
          let f = p.format ?? 'Post'
          const lf = f.toLowerCase()
          if (lf.includes('video') || lf.includes('reel') || lf.includes('clip')) f = 'Video'
          else if (lf.includes('image') || lf.includes('photo')) f = 'Image'
          else if (lf.includes('carousel') || lf.includes('sidecar')) f = 'Carousel'
          if (!formatStats[f]) formatStats[f] = { count: 0, totalReach: 0, avgReach: 0 }
          formatStats[f].count++
          formatStats[f].totalReach += p.reach ?? 0
        }
        for (const f in formatStats) formatStats[f].avgReach = formatStats[f].totalReach / formatStats[f].count
        const videoEntry = Object.entries(formatStats).find(([f]) => f === 'Video')
        const topEntry = Object.entries(formatStats).sort(([, a], [, b]) => b.avgReach - a.avgReach)[0]
        selectedFormat = (videoEntry && videoEntry[1].avgReach > 0 ? videoEntry[0] : topEntry?.[0]) ?? 'Post'
      }

      if (!selectedTopic) {
        const samples = platformPosts.slice(0, 15).map((p) => p.content).filter(Boolean)
        const hashtags: string[] = []
        for (const c of samples) for (const tag of c.match(/#[\w]+/g) ?? []) hashtags.push(tag)
        if (hashtags.length > 0) {
          const counts: Record<string, number> = {}
          for (const t of hashtags) counts[t] = (counts[t] ?? 0) + 1
          selectedTopic = Object.entries(counts).sort(([, a], [, b]) => b - a)[0]?.[0].replace('#', '') ?? 'general'
        } else if (samples[0]) {
          selectedTopic = samples[0].split(/[\s\n]+/).filter((w) => w.length > 3 && !w.startsWith('http')).slice(0, 3).join(' ') || 'general'
        } else {
          selectedTopic = 'general'
        }
      }
    }

    if (!selectedPlatform || !selectedFormat || !selectedTopic) {
      return NextResponse.json({ error: 'platform, format, and topic are required' }, { status: 400 })
    }

    const { data: posts } = await supabase
      .from('posts')
      .select('format, reach, likes, comments, shares, content, posted_at')
      .eq('user_id', user.id)
      .eq('platform', selectedPlatform)
      .order('posted_at', { ascending: false })
      .limit(30)

    const analysis = await runSimulation(
      selectedPlatform,
      selectedFormat,
      selectedTopic,
      settings as Pick<Settings, 'brand_name' | 'niche' | 'tone'>,
      (posts ?? []) as Post[],
    )

    const { data: run, error: runError } = await supabase
      .from('simulation_runs')
      .insert({
        user_id: user.id,
        platform: selectedPlatform,
        format: selectedFormat,
        topic: selectedTopic,
        model_confidence: analysis.model_confidence,
        pattern_evidence: analysis.pattern_evidence,
        playbook: analysis.playbook,
        optimal_specs: analysis.optimal_specs,
      })
      .select('id')
      .single()

    if (runError) throw runError

    const rows = analysis.ideas.map((idea) => ({
      user_id: user.id,
      run_id: run.id,
      platform: selectedPlatform,
      format: selectedFormat,
      topic: selectedTopic,
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

    const { data: saved, error: saveError } = await supabase
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
    console.error('[simulate] error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
