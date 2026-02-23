'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'

export default function ChangePasswordPage() {
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (password.length < 6) { toast.error('סיסמה חייבת להכיל לפחות 6 תווים'); return }
    if (password !== confirm) { toast.error('הסיסמאות אינן תואמות'); return }
    setLoading(true)

    const { error } = await supabase.auth.updateUser({ password })
    if (error) { toast.error('שגיאה בשינוי סיסמה'); setLoading(false); return }

    // Update must_change_password flag
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      await supabase.from('profiles').update({ must_change_password: false }).eq('id', user.id)
    }

    toast.success('סיסמה עודכנה בהצלחה ✓')
    router.push('/dashboard')
    router.refresh()
    setLoading(false)
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="text-5xl mb-4">🔐</div>
          <h1 className="text-2xl font-black text-white">שינוי סיסמה</h1>
          <p className="text-sm mt-1" style={{ color: '#7a7f9e' }}>הגדר סיסמה חדשה לחשבונך</p>
        </div>
        <div className="rounded-2xl p-6" style={{ background: '#1a1d27', border: '1px solid #2e3350' }}>
          <form onSubmit={handleSubmit} className="space-y-4">
            {[
              { label: 'סיסמה חדשה', val: password, set: setPassword },
              { label: 'אימות סיסמה', val: confirm, set: setConfirm },
            ].map(({ label, val, set }) => (
              <div key={label}>
                <label className="block text-sm font-semibold mb-1.5" style={{ color: '#7a7f9e' }}>{label}</label>
                <input type="password" value={val} onChange={e => set(e.target.value)} required placeholder="••••••••"
                  className="w-full px-4 py-3 rounded-xl text-sm font-medium"
                  style={{ background: '#0f1117', border: '1px solid #2e3350', color: '#e8eaf6', outline: 'none' }}
                  onFocus={e => e.target.style.borderColor = '#4f7ef8'}
                  onBlur={e => e.target.style.borderColor = '#2e3350'} />
              </div>
            ))}
            <button type="submit" disabled={loading}
              className="w-full py-3 rounded-xl font-bold text-white"
              style={{ background: 'linear-gradient(135deg, #4f7ef8, #7c5cbf)', opacity: loading ? 0.6 : 1 }}>
              {loading ? 'שומר...' : 'שמור סיסמה'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
