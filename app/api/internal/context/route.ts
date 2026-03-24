import { NextRequest, NextResponse } from 'next/server'
import { timingSafeEqual } from 'crypto'
import { supabaseAdmin } from '@/lib/supabase/admin'

function isAuthorized(request: NextRequest): boolean {
  const secret = process.env.INTERNAL_API_SECRET
  if (!secret) return false
  const provided = request.headers.get('Authorization') ?? ''
  const expected = `Bearer ${secret}`
  const expectedBuf = Buffer.from(expected)
  const providedBuf = Buffer.from(provided.padEnd(expected.length, '\0').slice(0, expected.length))
  return expected.length === provided.length && timingSafeEqual(expectedBuf, providedBuf)
}

export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const platform = searchParams.get('platform')

  try {
    const { data: settings, error: settingsError } = await supabaseAdmin
      .from('settings')
      .select('brand_name, niche, tone')
      .limit(1)
      .single()

    if (settingsError) throw settingsError

    let postsQuery = supabaseAdmin
      .from('posts')
      .select('format, content, score, likes, comments, shares, reach, posted_at')
      .not('score', 'is', null)
      .order('score', { ascending: false })
      .limit(10)

    if (platform) postsQuery = postsQuery.eq('platform', platform)

    const { data: posts, error: postsError } = await postsQuery
    if (postsError) throw postsError

    return NextResponse.json({
      brand: {
        brand_name: settings.brand_name,
        niche: settings.niche,
        tone: settings.tone,
      },
      top_posts: posts ?? [],
    })
  } catch (err) {
    console.error('[internal/context] error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
