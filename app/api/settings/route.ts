import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import type { Settings } from '@/types'

export async function GET() {
  try {
    const { data, error } = await supabaseAdmin
      .from('settings')
      .select('*')
      .limit(1)
      .single()

    if (error && error.code !== 'PGRST116') throw error // PGRST116 = no rows

    return NextResponse.json(data ?? {})
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as Partial<Omit<Settings, 'id' | 'updated_at'>>

    // Check if a settings row exists
    const { data: existing } = await supabaseAdmin
      .from('settings')
      .select('id')
      .limit(1)
      .single()

    let result

    if (existing?.id) {
      const { data, error } = await supabaseAdmin
        .from('settings')
        .update({ ...body, updated_at: new Date().toISOString() })
        .eq('id', existing.id)
        .select()
        .single()
      if (error) {
        console.error('[settings POST update]', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
      }
      result = data
    } else {
      const { data, error } = await supabaseAdmin
        .from('settings')
        .insert({ ...body, updated_at: new Date().toISOString() })
        .select()
        .single()
      if (error) {
        console.error('[settings POST insert]', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
      }
      result = data
    }

    return NextResponse.json(result)
  } catch (err) {
    const message = err instanceof Error ? err.message : JSON.stringify(err)
    console.error('[settings POST]', err)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
