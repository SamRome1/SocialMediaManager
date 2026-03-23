import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { scrapeAndStore, fetchAndStoreProfile } from '@/lib/apify'

// Allow up to 5 minutes for multi-platform scraping on Vercel Pro
export const maxDuration = 300

export async function POST() {
  try {
    // Source of truth: every (platform, handle) that has ever been scraped
    const { data: profiles, error: profilesError } = await supabaseAdmin
      .from('profiles')
      .select('platform, handle')
      .order('platform')

    if (profilesError) {
      return NextResponse.json({ error: profilesError.message }, { status: 500 })
    }

    if (!profiles?.length) {
      return NextResponse.json(
        { error: 'No previously scraped accounts found. Scrape at least one account first.' },
        { status: 404 },
      )
    }

    const { data: settings } = await supabaseAdmin
      .from('settings')
      .select('apify_token')
      .limit(1)
      .single()

    const apifyToken = settings?.apify_token || undefined

    // 3-month lookback
    const cutoffDate = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)

    const results: Array<{
      platform: string
      handle: string
      inserted: number
      skipped: number
      errors: number
      error?: string
    }> = []

    for (const { platform, handle } of profiles) {
      try {
        const [postsResult] = await Promise.all([
          scrapeAndStore(platform, handle, apifyToken, cutoffDate),
          fetchAndStoreProfile(platform, handle, apifyToken),
        ])
        results.push({ platform, handle, ...postsResult })
        console.log(`[scrape-all] ${platform} (${handle}): inserted ${postsResult.inserted}, skipped ${postsResult.skipped}`)
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error'
        console.error(`[scrape-all] ${platform} (${handle}) error:`, message)
        results.push({ platform, handle, inserted: 0, skipped: 0, errors: 1, error: message })
      }
    }

    const totalInserted = results.reduce((sum, r) => sum + r.inserted, 0)
    const totalErrors = results.reduce((sum, r) => sum + r.errors, 0)

    return NextResponse.json({ success: true, results, totalInserted, totalErrors })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('[scrape-all] fatal error:', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
