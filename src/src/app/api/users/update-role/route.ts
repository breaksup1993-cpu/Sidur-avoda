import { createClient as createServerClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const supabase = createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'לא מחובר' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'manager') return NextResponse.json({ error: 'הרשאת מנהל נדרשת' }, { status: 403 })

  const { userId, role } = await request.json()
  if (!userId || !role) return NextResponse.json({ error: 'חסרים שדות' }, { status: 400 })
  if (!['manager', 'shift_manager', 'employee'].includes(role)) {
    return NextResponse.json({ error: 'תפקיד לא חוקי' }, { status: 400 })
  }

  const { error } = await supabase.from('profiles').update({ role }).eq('id', userId)
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  return NextResponse.json({ success: true })
}
