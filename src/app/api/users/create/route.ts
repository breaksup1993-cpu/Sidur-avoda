import { createAdminClient, createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'לא מחובר' }, { status: 401 })

  // Verify manager role
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'manager') return NextResponse.json({ error: 'הרשאה נדרשת' }, { status: 403 })

  const { name, email, password, role } = await request.json()
  if (!name || !email || !password) return NextResponse.json({ error: 'חסרים שדות' }, { status: 400 })

  const adminSupabase = createAdminClient()

  // Create auth user
  const { data: newUser, error: authError } = await adminSupabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  })

  if (authError) return NextResponse.json({ error: authError.message }, { status: 400 })

  // Create profile
  const { error: profileError } = await adminSupabase.from('profiles').insert({
    id: newUser.user.id,
    email,
    name,
    role: role || 'employee',
    must_change_password: true,
    created_at: new Date().toISOString(),
  })

  if (profileError) {
    await adminSupabase.auth.admin.deleteUser(newUser.user.id)
    return NextResponse.json({ error: profileError.message }, { status: 400 })
  }

  return NextResponse.json({ success: true, userId: newUser.user.id })
}
