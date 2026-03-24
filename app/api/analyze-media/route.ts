import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { analyzeMedia } from '@/lib/anthropic'
import type { Post } from '@/types'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await request.json() as {
      frames: string[]
      mediaType: 'image' | 'video'
      platform: string
      format: string
    }
    const { frames, mediaType, platform, format } = body

    if (!frames?.length) {
      return NextResponse.json({ error: 'No media provided' }, { status: 400 })
    }

    const [settingsRes, postsRes] = await Promise.all([
      supabase.from('settings').select('brand_name, niche, tone').eq('user_id', user.id).single(),
      supabase
        .from('posts')
        .select('format, reach, likes, comments, shares, content, posted_at')
        .eq('user_id', user.id)
        .eq('platform', platform)
        .order('posted_at', { ascending: false })
        .limit(20),
    ])

    const settings = settingsRes.data ?? { brand_name: 'My Brand', niche: 'general', tone: 'Professional' }
    const posts = (postsRes.data ?? []) as Post[]

    const analysis = await analyzeMedia(frames, mediaType, platform, format, settings, posts)

    return NextResponse.json({ analysis })
  } catch (err) {
    console.error('[analyze-media] error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
