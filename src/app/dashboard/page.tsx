import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import EmployeeDashboard from './EmployeeDashboard'
import ManagerDashboard from './ManagerDashboard'

export default async function DashboardPage() {
  const supabase = createClient()
  const { data: { user: authUser } } = await supabase.auth.getUser()
  if (!authUser) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', authUser.id)
    .single()

  if (!profile) redirect('/login')

  if (profile.must_change_password) redirect('/change-password')

  // manager and shift_manager get manager dashboard
  if (profile.role === 'manager' || profile.role === 'shift_manager') {
    return <ManagerDashboard profile={profile} />
  }

  return <EmployeeDashboard profile={profile} />
}
