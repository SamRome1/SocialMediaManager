import { NextRequest, NextResponse } from 'next/server'
import { timingSafeEqual } from 'crypto'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { scrapeAndStore, fetchAndStoreProfile } from '@/lib/apify'

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('Authorization')
  const cronSecret = process.env.CRON_SECRET

  if (!cronSecret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const expected = `Bearer ${cronSecret}`
  const provided = authHeader ?? ''
  // Use constant-time comparison to prevent timing attacks
  const expectedBuf = Buffer.from(expected)
  const providedBuf = Buffer.from(provided.padEnd(expected.length, '\0').slice(0, expected.length))
  const match = expected.length === provided.length && timingSafeEqual(expectedBuf, providedBuf)

  if (!match) {
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
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
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
    console.error('[cron] fatal error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
