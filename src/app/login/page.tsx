'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      toast.error('שגיאה בהתחברות – בדוק אימייל וסיסמה')
    } else {
      router.push('/dashboard')
      router.refresh()
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4"
      style={{ background: 'linear-gradient(135deg, #0f1117 0%, #1a1d27 100%)' }}>

      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-4"
            style={{ background: 'linear-gradient(135deg, #4f7ef8, #7c5cbf)' }}>
            <span className="text-3xl">🏖️</span>
          </div>
          <h1 className="text-2xl font-black text-white">משמר אילת</h1>
          <p className="text-sm mt-1" style={{ color: '#7a7f9e' }}>סידור עבודה</p>
        </div>

        {/* Form */}
        <div className="rounded-2xl p-6" style={{ background: '#1a1d27', border: '1px solid #2e3350' }}>
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold mb-1.5" style={{ color: '#7a7f9e' }}>
                אימייל
              </label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                placeholder="your@email.com"
                className="w-full px-4 py-3 rounded-xl text-sm font-medium transition-colors"
                style={{
                  background: '#0f1117',
                  border: '1px solid #2e3350',
                  color: '#e8eaf6',
                  outline: 'none',
                }}
                onFocus={e => e.target.style.borderColor = '#4f7ef8'}
                onBlur={e => e.target.style.borderColor = '#2e3350'}
              />
            </div>
            <div>
              <label className="block text-sm font-semibold mb-1.5" style={{ color: '#7a7f9e' }}>
                סיסמה
              </label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                placeholder="••••••••"
                className="w-full px-4 py-3 rounded-xl text-sm font-medium transition-colors"
                style={{
                  background: '#0f1117',
                  border: '1px solid #2e3350',
                  color: '#e8eaf6',
                  outline: 'none',
                }}
                onFocus={e => e.target.style.borderColor = '#4f7ef8'}
                onBlur={e => e.target.style.borderColor = '#2e3350'}
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl font-bold text-white transition-opacity"
              style={{ background: 'linear-gradient(135deg, #4f7ef8, #7c5cbf)', opacity: loading ? 0.6 : 1 }}
            >
              {loading ? 'מתחבר...' : 'התחבר'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
