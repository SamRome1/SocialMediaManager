import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { scrapeAndStore, fetchAndStoreProfile } from '@/lib/apify'

export const maxDuration = 300

export async function POST() {
  try {
    const supabase = await createSupabaseServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('platform, handle')
      .eq('user_id', user.id)
      .order('platform')

    if (profilesError) { console.error('[scrape-all] profiles error:', profilesError); return NextResponse.json({ error: 'Internal server error' }, { status: 500 }) }
    if (!profiles?.length) {
      return NextResponse.json(
        { error: 'No previously scraped accounts found. Scrape at least one account first.' },
        { status: 404 },
      )
    }

    const { data: settings } = await supabase
      .from('settings')
      .select('apify_token')
      .eq('user_id', user.id)
      .single()

    const apifyToken = settings?.apify_token || undefined
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
          scrapeAndStore(platform, handle, user.id, apifyToken, cutoffDate),
          fetchAndStoreProfile(platform, handle, user.id, apifyToken),
        ])
        results.push({ platform, handle, ...postsResult })
      } catch (err) {
        console.error(`[scrape-all] ${platform} (${handle}) error:`, err)
        results.push({ platform, handle, inserted: 0, skipped: 0, errors: 1, error: 'Scrape failed' })
      }
    }

    const totalInserted = results.reduce((sum, r) => sum + r.inserted, 0)
    const totalErrors = results.reduce((sum, r) => sum + r.errors, 0)

    return NextResponse.json({ success: true, results, totalInserted, totalErrors })
  } catch (err) {
    console.error('[scrape-all] fatal error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
