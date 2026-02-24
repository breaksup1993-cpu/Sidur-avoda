import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'לא מחובר' }, { status: 401 })

  const { swapId, action } = await request.json()
  if (!swapId || !action) return NextResponse.json({ error: 'חסרים פרטים' }, { status: 400 })

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  const isManager = profile?.role === 'manager' || profile?.role === 'shift_manager'

  if (action === 'accept' || action === 'reject') {
    const { data: swap } = await supabase.from('swap_requests').select('target_id').eq('id', swapId).single()
    if (swap?.target_id !== user.id && !isManager) {
      return NextResponse.json({ error: 'אין הרשאה' }, { status: 403 })
    }
    const status = action === 'accept' ? 'accepted' : 'rejected'
    const { error } = await supabase.from('swap_requests')
      .update({ status, updated_at: new Date().toISOString() }).eq('id', swapId)
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    return NextResponse.json({ success: true })
  }

  if (action === 'manager_approve' || action === 'manager_reject') {
    if (!isManager) return NextResponse.json({ error: 'הרשאת מנהל נדרשת' }, { status: 403 })
    const status = action === 'manager_approve' ? 'manager_approved' : 'manager_rejected'
    const { error } = await supabase.from('swap_requests')
      .update({ status, updated_at: new Date().toISOString() }).eq('id', swapId)
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    return NextResponse.json({ success: true })
  }

  return NextResponse.json({ error: 'פעולה לא חוקית' }, { status: 400 })
}
