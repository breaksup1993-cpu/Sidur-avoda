import { createClient as createServerClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const supabase = createServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'לא מחובר' }, { status: 401 })

    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
    if (profile?.role !== 'manager') return NextResponse.json({ error: 'הרשאת מנהל נדרשת' }, { status: 403 })

    const { requestId, managerNote } = await request.json()
    if (!requestId) return NextResponse.json({ error: 'חסר requestId' }, { status: 400 })

    const { error } = await supabase
      .from('week_requests')
      .update({ 
        status: 'approved', 
        manager_note: managerNote || '', 
        updated_at: new Date().toISOString() 
      })
      .eq('id', requestId)

    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: 'שגיאה בשרת' }, { status: 500 })
  }
}
