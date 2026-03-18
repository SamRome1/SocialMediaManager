import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { analyzeMedia } from '@/lib/anthropic'
import type { Post } from '@/types'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as {
      frames: string[]          // base64 JPEG(s) — 1 for image, up to 3 for video
      mediaType: 'image' | 'video'
      platform: string
      format: string
    }

    const { frames, mediaType, platform, format } = body

    if (!frames?.length) {
      return NextResponse.json({ error: 'No media provided' }, { status: 400 })
    }

    // Fetch settings + recent posts for context in parallel
    const [settingsRes, postsRes] = await Promise.all([
      supabaseAdmin.from('settings').select('brand_name, niche, tone').limit(1).single(),
      supabaseAdmin
        .from('posts')
        .select('format, reach, likes, comments, shares, content, posted_at')
        .eq('platform', platform)
        .order('posted_at', { ascending: false })
        .limit(20),
    ])

    const settings = settingsRes.data ?? { brand_name: 'My Brand', niche: 'general', tone: 'Professional' }
    const posts = (postsRes.data ?? []) as Post[]

    const analysis = await analyzeMedia(frames, mediaType, platform, format, settings, posts)

    return NextResponse.json({ analysis })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('[analyze-media] error:', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
