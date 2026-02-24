import { createClient as createServerClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const supabase = createServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'לא מחובר' }, { status: 401 })

    const { target_id, requester_shift, target_shift, note } = await request.json()
    if (!target_id || !requester_shift || !target_shift) {
      return NextResponse.json({ error: 'חסרים שדות' }, { status: 400 })
    }

    // Check if target exists
    const { data: targetUser } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', target_id)
      .single()
    if (!targetUser) return NextResponse.json({ error: 'המשתמש לא קיים' }, { status: 400 })

    const payload = {
      requester_id: user.id,
      target_id,
      requester_shift,
      target_shift,
      status: 'pending',
      note: note || '',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    const { error } = await supabase.from('swap_requests').insert(payload)
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })

    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: 'שגיאה בשרת' }, { status: 500 })
  }
}
