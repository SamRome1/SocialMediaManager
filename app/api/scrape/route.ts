import { NextRequest, NextResponse } from 'next/server'
import { scrapeAndStore, fetchAndStoreProfile } from '@/lib/apify'
import { supabaseAdmin } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as { platform?: string; handle?: string }
    const { platform, handle } = body

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

    // Run posts scrape and profile fetch in parallel
    const [postsResult, profile] = await Promise.all([
      scrapeAndStore(platform, handle, apifyToken),
      fetchAndStoreProfile(platform, handle, apifyToken),
    ])

    return NextResponse.json({
      success: true,
      platform,
      handle,
      inserted: postsResult.inserted,
      errors: postsResult.errors,
      profile: profile ?? null,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('[scrape] error:', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
