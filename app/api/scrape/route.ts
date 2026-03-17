import { NextRequest, NextResponse } from 'next/server'
import { scrapeAndStore, fetchAndStoreProfile } from '@/lib/apify'
import { supabaseAdmin } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as { 
      platform?: string
      handle?: string
      timePeriod?: '1w' | '1m' | '3m' | '6m'
    }
    const { platform, handle, timePeriod = '1m' } = body

    if (!platform || !handle) {
      return NextResponse.json(
        { error: 'platform and handle are required' },
        { status: 400 },
      )
    }

    const { data: settings } = await supabaseAdmin
      .from('settings')
      .select('apify_token')
      .limit(1)
      .single()

    const apifyToken = settings?.apify_token || undefined

    // Calculate date range
    const now = new Date()
    let daysBack = 30 // default 1 month
    if (timePeriod === '1w') daysBack = 7
    else if (timePeriod === '1m') daysBack = 30
    else if (timePeriod === '3m') daysBack = 90
    else if (timePeriod === '6m') daysBack = 180

    const cutoffDate = new Date(now.getTime() - daysBack * 24 * 60 * 60 * 1000)
    console.log('[scrape] time period:', timePeriod, 'days back:', daysBack, 'cutoff date:', cutoffDate)

    // Run posts scrape and profile fetch in parallel
    const [postsResult, profile] = await Promise.all([
      scrapeAndStore(platform, handle, apifyToken, cutoffDate),
      fetchAndStoreProfile(platform, handle, apifyToken),
    ])

    return NextResponse.json({
      success: true,
      platform,
      handle,
      timePeriod,
      inserted: postsResult.inserted,
      skipped: postsResult.skipped,
      errors: postsResult.errors,
      profile: profile ?? null,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('[scrape] error:', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
