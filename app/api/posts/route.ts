import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const platform = searchParams.get('platform')
    const limit = Number(searchParams.get('limit') ?? '50')

    let query = supabaseAdmin
      .from('posts')
      .select('*')
      .order('posted_at', { ascending: false })
      .limit(Math.min(limit, 200))

    if (platform) {
      query = query.eq('platform', platform)
    }

    const { data, error } = await query
    if (error) throw error

    return NextResponse.json(data ?? [])
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
