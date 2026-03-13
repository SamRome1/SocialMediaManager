import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { scrapeAndStore } from '@/lib/apify'

export async function GET(request: NextRequest) {
  // Verify cron secret to prevent unauthorized triggers
  const authHeader = request.headers.get('Authorization')
  const cronSecret = process.env.CRON_SECRET

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    // Fetch active settings: platforms, handles, and apify token
    const { data: settings, error: settingsError } = await supabaseAdmin
      .from('settings')
      .select('platforms, apify_token, brand_name')
      .limit(1)
      .single()

    if (settingsError || !settings) {
      console.error('[cron] No settings found')
      return NextResponse.json({ error: 'No settings configured' }, { status: 404 })
    }

    const { platforms, apify_token } = settings as {
      platforms: string[]
      apify_token: string
      brand_name: string
    }

    if (!platforms || platforms.length === 0) {
      return NextResponse.json({ message: 'No platforms configured', results: [] })
    }

    // For each active platform, fetch the handle from settings (stored as "platform:handle")
    // Convention: store handles in settings as an array of "platform:handle" strings
    const { data: handleSettings } = await supabaseAdmin
      .from('settings')
      .select('scrape_schedule')
      .limit(1)
      .single()

    // scrape_schedule field stores handles as JSON: { instagram: "@handle", tiktok: "@handle" }
    let handleMap: Record<string, string> = {}
    try {
      handleMap = JSON.parse(handleSettings?.scrape_schedule ?? '{}') as Record<string, string>
    } catch {
      handleMap = {}
    }

    const results: Array<{
      platform: string
      handle: string
      inserted: number
      errors: number
    }> = []

    for (const platform of platforms) {
      const handle = handleMap[platform]
      if (!handle) {
        console.warn(`[cron] No handle configured for ${platform}, skipping`)
        continue
      }

      try {
        const result = await scrapeAndStore(platform, handle, apify_token)
        results.push({ platform, handle, ...result })
        console.log(`[cron] ${platform} (${handle}): inserted ${result.inserted}, errors ${result.errors}`)
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error'
        console.error(`[cron] ${platform} error:`, message)
        results.push({ platform, handle, inserted: 0, errors: 1 })
      }
    }

    return NextResponse.json({ success: true, results })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('[cron] fatal error:', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
