import { createClient } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const supabase = createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'לא מחובר' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (!profile || !['manager'].includes(profile.role)) {
    return NextResponse.json({ error: 'הרשאה נדרשת' }, { status: 403 })
  }

  const { name, email, password, role } = await request.json()
  if (!name || !email || !password) return NextResponse.json({ error: 'חסרים שדות' }, { status: 400 })

  const adminSupabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  const { data: newUser, error: authError } = await adminSupabase.auth.admin.createUser({
    email, password, email_confirm: true,
  })
  if (authError) return NextResponse.json({ error: authError.message }, { status: 400 })

  const { error: profileError } = await adminSupabase.from('profiles').insert({
    id: newUser.user.id, email, name,
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
