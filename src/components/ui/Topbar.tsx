'use client'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { User } from '@/types'

interface TopbarProps { user: User }

const ROLE_LABELS: Record<string, string> = {
  manager: 'מנהל',
  shift_manager: 'אחמש',
  employee: 'עובד',
}

export default function Topbar({ user }: TopbarProps) {
  const router = useRouter()
  const supabase = createClient()

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <header className="sticky top-0 z-50 flex items-center justify-between px-4 h-14"
      style={{ background: '#1a1d27', borderBottom: '1px solid #2e3350' }}>
      <div className="flex items-center gap-3">
        <div>
          <span className="font-black text-lg text-white">משמר</span>
          <span className="font-black text-lg" style={{ color: '#4f7ef8' }}> אילת</span>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <div className="text-left hidden sm:block">
          <div className="text-sm font-bold text-white">{user.name}</div>
          <div className="text-xs" style={{ color: '#7a7f9e' }}>
            {ROLE_LABELS[user.role] || user.role}
          </div>
        </div>
        <button onClick={handleLogout}
          className="px-3 py-1.5 rounded-lg text-xs font-bold"
          style={{ background: '#222638', border: '1px solid #2e3350', color: '#7a7f9e' }}>
          התנתק
        </button>
      </div>
    </header>
  )
}
