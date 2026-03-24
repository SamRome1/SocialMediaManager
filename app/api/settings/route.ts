import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import type { Settings } from '@/types'

export async function GET() {
  try {
    const supabase = await createSupabaseServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data, error } = await supabase
      .from('settings')
      .select('*')
      .eq('user_id', user.id)
      .single()

    if (error && error.code !== 'PGRST116') throw error // PGRST116 = no rows

    return NextResponse.json(data ?? {})
  } catch (err) {
    console.error('[settings GET] error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await request.json() as Partial<Omit<Settings, 'id' | 'updated_at' | 'user_id'>>

    const { data: existing } = await supabase
      .from('settings')
      .select('id')
      .eq('user_id', user.id)
      .single()

    let result
    if (existing?.id) {
      const { data, error } = await supabase
        .from('settings')
        .update({ ...body, updated_at: new Date().toISOString() })
        .eq('id', existing.id)
        .select()
        .single()
      if (error) { console.error('[settings POST] update error:', error); return NextResponse.json({ error: 'Internal server error' }, { status: 500 }) }
      result = data
    } else {
      const { data, error } = await supabase
        .from('settings')
        .insert({ ...body, user_id: user.id, updated_at: new Date().toISOString() })
        .select()
        .single()
      if (error) { console.error('[settings POST] insert error:', error); return NextResponse.json({ error: 'Internal server error' }, { status: 500 }) }
      result = data
    }

    return NextResponse.json(result)
  } catch (err) {
    console.error('[settings POST] error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
