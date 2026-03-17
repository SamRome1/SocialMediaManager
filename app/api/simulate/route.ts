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

    // Auto-generation: derive from existing posts
    if (auto) {
      console.log('[simulate] auto mode enabled, fetching posts from last', timePeriod)
      
      // Calculate date range
      const now = new Date()
      let daysBack = 30 // default 1 month
      if (timePeriod === '1w') daysBack = 7
      else if (timePeriod === '1m') daysBack = 30
      else if (timePeriod === '3m') daysBack = 90
      else if (timePeriod === '6m') daysBack = 180
      
      const cutoffDate = new Date(now.getTime() - daysBack * 24 * 60 * 60 * 1000).toISOString()
      console.log('[simulate] fetching posts after:', cutoffDate)
      
      const { data: allPosts } = await supabaseAdmin
        .from('posts')
        .select('platform, format, content, reach, posted_at')
        .gte('posted_at', cutoffDate)
        .order('reach', { ascending: false })
        .limit(100)

      console.log('[simulate] allPosts count:', allPosts?.length ?? 0)
      if (allPosts && allPosts.length > 0) {
        console.log('[simulate] sample posts (first 5):', allPosts.slice(0, 5).map((p) => ({
          platform: (p as Record<string, unknown>).platform,
          format: (p as Record<string, unknown>).format,
          reach: (p as Record<string, unknown>).reach,
          content_preview: ((p as Record<string, unknown>).content as string)?.slice(0, 100),
        })))
      }

      if (!allPosts || allPosts.length === 0) {
        console.error('[simulate] no posts found in time period')
        return NextResponse.json(
          { error: `No posts found in the last ${daysBack} days. Please scrape your social media first.` },
          { status: 400 },
        )
      }

      // Derive platform from most posts
      const platformCounts: Record<string, number> = {}
      for (const post of allPosts) {
        const p = post as Record<string, unknown>
        const plat = p.platform as string
        platformCounts[plat] = (platformCounts[plat] ?? 0) + 1
      }
      const topPlatform = Object.entries(platformCounts).sort(([, a], [, b]) => b - a)[0]
      selectedPlatform = topPlatform ? topPlatform[0] : 'instagram'
      console.log('[simulate] selected platform:', selectedPlatform, 'counts:', platformCounts)

      // Derive format from top performing posts on that platform
      // Prioritize video/reel formats over images
      const platformPosts = allPosts.filter((p) => {
        const post = p as Record<string, unknown>
        return post.platform === selectedPlatform
      })
      
      // Calculate stats by format
      const formatStats: Record<string, { count: number; totalReach: number; avgReach: number }> = {}
      for (const post of platformPosts) {
        const p = post as Record<string, unknown>
        let fmt = (p.format as string) ?? 'Post'
        
        // Normalize format names - recognize video/reel content
        const lowerFmt = fmt.toLowerCase()
        if (lowerFmt.includes('video') || lowerFmt.includes('reel') || lowerFmt.includes('clip')) {
          fmt = 'Video'
        } else if (lowerFmt.includes('image') || lowerFmt.includes('photo')) {
          fmt = 'Image'
        } else if (lowerFmt.includes('carousel') || lowerFmt.includes('sidecar')) {
          fmt = 'Carousel'
        }
        
        const reach = (p.reach as number) ?? 0
        if (!formatStats[fmt]) {
          formatStats[fmt] = { count: 0, totalReach: 0, avgReach: 0 }
        }
        formatStats[fmt].count += 1
        formatStats[fmt].totalReach += reach
      }
      
      // Calculate average reach per format
      for (const fmt in formatStats) {
        formatStats[fmt].avgReach = formatStats[fmt].totalReach / formatStats[fmt].count
      }
      
      // Prioritize Video/Reel formats if they exist and perform reasonably
      let topFormat = Object.entries(formatStats).sort(([, a], [, b]) => b.avgReach - a.avgReach)[0]
      
      // If Video format exists, prefer it over Image
      const videoFormat = Object.entries(formatStats).find(([fmt]) => fmt === 'Video')
      if (videoFormat && videoFormat[1].avgReach > 0) {
        topFormat = videoFormat
      }
      
      selectedFormat = topFormat ? topFormat[0] : 'Post'
      console.log('[simulate] selected format:', selectedFormat, 'stats:', formatStats)

      // Extract topic from content - get the most common keywords/themes
      const contentSamples = platformPosts
        .slice(0, 15)
        .map((p) => (p as Record<string, unknown>).content as string)
        .filter((c) => c && c.length > 0)
      
      if (contentSamples.length > 0) {
        // Extract meaningful phrases (not just first 3 words)
        // Look for hashtags first
        const allHashtags: string[] = []
        for (const content of contentSamples) {
          const hashtags = content.match(/#[\w]+/g) ?? []
          allHashtags.push(...hashtags)
        }
        
        if (allHashtags.length > 0) {
          // Use most common hashtag as topic
          const hashtagCounts: Record<string, number> = {}
          for (const tag of allHashtags) {
            hashtagCounts[tag] = (hashtagCounts[tag] ?? 0) + 1
          }
          const topHashtag = Object.entries(hashtagCounts).sort(([, a], [, b]) => b - a)[0]
          if (topHashtag) {
            selectedTopic = topHashtag[0].replace('#', '')
          }
        } else {
          // Fallback: use first meaningful words
          const words = contentSamples[0]
            .split(/[\s\n]+/)
            .filter((w) => w.length > 3 && !w.startsWith('http'))
            .slice(0, 3)
          selectedTopic = words.join(' ') || 'general'
        }
      } else {
        selectedTopic = 'general'
      }
      console.log('[simulate] selected topic:', selectedTopic)
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
