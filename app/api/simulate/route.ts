import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { runSimulation } from '@/lib/anthropic'
import type { Post, Settings } from '@/types'

export async function POST(request: NextRequest) {
  try {
    console.log('[simulate] POST request received')
    const body = await request.json() as {
      platform?: string
      format?: string
      topic?: string
      auto?: boolean
      timePeriod?: '1w' | '1m' | '3m' | '6m'
    }
    const { platform, format, topic, auto, timePeriod = '1m' } = body
    console.log('[simulate] request body:', { platform, format, topic, auto, timePeriod })

    console.log('[simulate] fetching settings...')
    const { data: settings, error: settingsError } = await supabaseAdmin
      .from('settings')
      .select('brand_name, niche, tone')
      .limit(1)
      .single()

    if (settingsError || !settings) {
      console.error('[simulate] settings error:', settingsError)
      return NextResponse.json(
        { error: 'Settings not configured. Please set up your brand in Settings.' },
        { status: 404 },
      )
    }
    console.log('[simulate] settings found:', settings)

    let selectedPlatform = platform
    let selectedFormat = format
    let selectedTopic = topic

    // Auto-derive any missing fields from recent posts
    const needsDerive = auto || !selectedPlatform || !selectedFormat || !selectedTopic
    if (needsDerive) {
      const now = new Date()
      let daysBack = 30
      if (timePeriod === '1w') daysBack = 7
      else if (timePeriod === '3m') daysBack = 90
      else if (timePeriod === '6m') daysBack = 180

      const cutoffDate = new Date(now.getTime() - daysBack * 24 * 60 * 60 * 1000).toISOString()

      const postsQuery = supabaseAdmin
        .from('posts')
        .select('platform, format, content, reach, posted_at')
        .gte('posted_at', cutoffDate)
        .order('reach', { ascending: false })
        .limit(100)

      // If platform is already chosen, scope the lookup to that platform
      if (selectedPlatform) postsQuery.eq('platform', selectedPlatform)

      const { data: allPosts } = await postsQuery

      if (!allPosts || allPosts.length === 0) {
        return NextResponse.json(
          { error: `No posts found. Please scrape your social media first.` },
          { status: 400 },
        )
      }

      type PostRow = { platform: string; format: string; content: string; reach: number }
      const rows = allPosts as PostRow[]

      // Derive platform (only if not already set)
      if (!selectedPlatform) {
        const counts: Record<string, number> = {}
        for (const p of rows) counts[p.platform] = (counts[p.platform] ?? 0) + 1
        selectedPlatform = Object.entries(counts).sort(([, a], [, b]) => b - a)[0]?.[0] ?? 'instagram'
      }

      const platformPosts = rows.filter((p) => p.platform === selectedPlatform)

      // Derive format (only if not already set)
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

      // Derive topic (only if not already set)
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
      console.error('[simulate] missing required fields:', { selectedPlatform, selectedFormat, selectedTopic })
      return NextResponse.json(
        { error: 'platform, format, and topic are required' },
        { status: 400 },
      )
    }

    console.log('[simulate] fetching historical posts for analysis...')
    const { data: posts } = await supabaseAdmin
      .from('posts')
      .select('format, reach, likes, comments, shares, content, posted_at')
      .eq('platform', selectedPlatform)
      .order('posted_at', { ascending: false })
      .limit(30)

    console.log('[simulate] historical posts count:', posts?.length ?? 0)
    console.log('[simulate] calling runSimulation...')
    const analysis = await runSimulation(
      selectedPlatform,
      selectedFormat,
      selectedTopic,
      settings as Pick<Settings, 'brand_name' | 'niche' | 'tone'>,
      (posts ?? []) as Post[],
    )
    console.log('[simulate] runSimulation completed, ideas count:', analysis.ideas.length)

    // Save the analytics run first
    console.log('[simulate] saving simulation run...')
    const { data: run, error: runError } = await supabaseAdmin
      .from('simulation_runs')
      .insert({
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

    if (runError) {
      console.error('[simulate] run save error:', runError)
      throw runError
    }

    console.log('[simulate] building rows...')
    const rows = analysis.ideas.map((idea) => ({
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

    console.log('[simulate] inserting rows...')
    const { data: saved, error: saveError } = await supabaseAdmin
      .from('simulations')
      .insert(rows)
      .select()

    if (saveError) {
      console.error('[simulate] save error:', saveError)
      throw saveError
    }

    console.log('[simulate] success, returning response...')
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
    const fullError = err instanceof Error ? err.stack : String(err)
    console.error('[simulate] error:', message)
    console.error('[simulate] full error:', fullError)
    console.error('[simulate] error object:', err)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
