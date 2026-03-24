import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { scrapeAndStore, fetchAndStoreProfile } from '@/lib/apify'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await request.json() as {
      platform?: string
      handle?: string
      timePeriod?: '1w' | '1m' | '3m' | '6m'
    }
    const { platform, handle, timePeriod = '1m' } = body

    if (!platform || !handle) {
      return NextResponse.json({ error: 'platform and handle are required' }, { status: 400 })
    }

    const { data: settings } = await supabase
      .from('settings')
      .select('apify_token')
      .eq('user_id', user.id)
      .single()

    const apifyToken = settings?.apify_token || undefined

    const daysBack = { '1w': 7, '1m': 30, '3m': 90, '6m': 180 }[timePeriod]
    const cutoffDate = new Date(Date.now() - daysBack * 24 * 60 * 60 * 1000)

    const [postsResult, profile] = await Promise.all([
      scrapeAndStore(platform, handle, user.id, apifyToken, cutoffDate),
      fetchAndStoreProfile(platform, handle, user.id, apifyToken),
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
    console.error('[scrape] error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
