import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { scrapeAndStore, fetchAndStoreProfile } from '@/lib/apify'

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('Authorization')
  const cronSecret = process.env.CRON_SECRET

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    // Fetch all users who have settings with at least one platform configured
    const { data: allSettings, error: settingsError } = await supabaseAdmin
      .from('settings')
      .select('user_id, platforms, apify_token, scrape_schedule')
      .not('user_id', 'is', null)

    if (settingsError) {
      console.error('[cron] settings error:', settingsError)
      return NextResponse.json({ error: settingsError.message }, { status: 500 })
    }

    if (!allSettings?.length) {
      return NextResponse.json({ message: 'No users configured', results: [] })
    }

    const allResults: Array<{
      user_id: string
      platform: string
      handle: string
      inserted: number
      errors: number
    }> = []

    for (const userSettings of allSettings) {
      const { user_id, platforms, apify_token, scrape_schedule } = userSettings as {
        user_id: string
        platforms: string[]
        apify_token: string
        scrape_schedule: string
      }

      if (!platforms?.length) continue

      let handleMap: Record<string, string> = {}
      try {
        handleMap = JSON.parse(scrape_schedule ?? '{}') as Record<string, string>
      } catch { handleMap = {} }

      for (const platform of platforms) {
        const handle = handleMap[platform]
        if (!handle) {
          console.warn(`[cron] user=${user_id} no handle for ${platform}, skipping`)
          continue
        }
        try {
          const result = await scrapeAndStore(platform, handle, user_id, apify_token || undefined)
          await fetchAndStoreProfile(platform, handle, user_id, apify_token || undefined)
          allResults.push({ user_id, platform, handle, inserted: result.inserted, errors: result.errors })
          console.log(`[cron] user=${user_id} ${platform} (${handle}): inserted ${result.inserted}`)
        } catch (err) {
          const message = err instanceof Error ? err.message : 'Unknown error'
          console.error(`[cron] user=${user_id} ${platform} error:`, message)
          allResults.push({ user_id, platform, handle, inserted: 0, errors: 1 })
        }
      }
    }

    return NextResponse.json({ success: true, results: allResults })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('[cron] fatal error:', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
