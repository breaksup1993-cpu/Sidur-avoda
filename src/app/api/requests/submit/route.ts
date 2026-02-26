import { createClient as createServerClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { validateRequest } from '@/lib/validation'

export async function POST(request: Request) {
  try {
    const supabase = createServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'לא מחובר' }, { status: 401 })

    const { week_start, selections } = await request.json()
    if (!week_start || !selections || !Array.isArray(selections)) return NextResponse.json({ error: 'חסרים שדות' }, { status: 400 })

    // Server-side validation
    const validation = validateRequest(selections)
    if (!validation.valid) {
      return NextResponse.json({ error: validation.errors[0] }, { status: 400 })
    }

    // Check if user is manager (managers auto-approve their own requests)
    const { data: userProfile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    const isManagerOrShiftManager = userProfile?.role === 'manager' || userProfile?.role === 'shift_manager'
    const status = isManagerOrShiftManager ? 'approved' : 'pending'

    const payload = {
      user_id: user.id,
      week_start,
      selections,
      status,
      submitted_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    // Check if request already exists
    const { data: existing } = await supabase
      .from('week_requests')
      .select('id, status')
      .eq('user_id', user.id)
      .eq('week_start', week_start)
      .single()

    if (existing) {
      if (existing.status !== 'pending' && !isManagerOrShiftManager) {
        return NextResponse.json({ error: 'לא ניתן לערוך בקשה שאושרה או נדחתה' }, { status: 400 })
      }
      // Update existing
      const { error } = await supabase
        .from('week_requests')
        .update({ selections, status, updated_at: new Date().toISOString() })
        .eq('id', existing.id)
      if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    } else {
      // Insert new
      const { error } = await supabase.from('week_requests').insert(payload)
      if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: 'שגיאה בשרת' }, { status: 500 })
  }
}
