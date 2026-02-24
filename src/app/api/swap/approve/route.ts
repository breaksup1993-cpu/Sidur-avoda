import { createClient as createServerClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const supabase = createServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'לא מחובר' }, { status: 401 })

    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
    if (profile?.role !== 'manager') return NextResponse.json({ error: 'הרשאת מנהל נדרשת' }, { status: 403 })

    const { swapId, approve } = await request.json()
    if (!swapId) return NextResponse.json({ error: 'חסר swapId' }, { status: 400 })

    const newStatus = approve ? 'manager_approved' : 'manager_rejected'

    const { error } = await supabase
      .from('swap_requests')
      .update({ 
        status: newStatus,
        updated_at: new Date().toISOString() 
      })
      .eq('id', swapId)

    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: 'שגיאה בשרת' }, { status: 500 })
  }
}
