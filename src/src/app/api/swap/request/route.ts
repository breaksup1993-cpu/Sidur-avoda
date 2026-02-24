import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'לא מחובר' }, { status: 401 })

  const { target_id, requester_shift, target_shift, note } = await request.json()
  if (!target_id || !requester_shift || !target_shift) {
    return NextResponse.json({ error: 'חסרים פרטים' }, { status: 400 })
  }
  if (target_id === user.id) {
    return NextResponse.json({ error: 'לא ניתן לבקש החלפה עם עצמך' }, { status: 400 })
  }

  const { error } = await supabase.from('swap_requests').insert({
    requester_id: user.id, target_id, requester_shift, target_shift,
    note: note || null, status: 'pending',
  })

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ success: true })
}
