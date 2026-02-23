'use client'
import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { WeekRequest, User } from '@/types'
import { validateRequest, countByCategory } from '@/lib/validation'
import { getWeekStart, getWeekDates, weekStartToISO, getWeekTitle, offsetWeek, formatDateHE } from '@/lib/week'
import { SHIFTS, DAYS_HE, DAYS_SHORT } from '@/lib/shifts'
import toast from 'react-hot-toast'

interface Props { profile: User }
type Tab = 'requests' | 'schedule' | 'users' | 'stats' | 'settings'

export default function ManagerDashboard({ profile }: Props) {
  const [tab, setTab] = useState<Tab>('requests')
  const [weekOffset, setWeekOffset] = useState(0)
  const [requests, setRequests] = useState<WeekRequest[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [deadline, setDeadline] = useState('')
  const [newDeadline, setNewDeadline] = useState('')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [managerNote, setManagerNote] = useState('')
  const [newUser, setNewUser] = useState({ name: '', email: '', password: '', role: 'employee' as const })
  const [creating, setCreating] = useState(false)
  const supabase = createClient()

  const weekStart = offsetWeek(getWeekStart(), weekOffset)
  const weekDates = getWeekDates(weekStart)
  const weekISO = weekStartToISO(weekStart)

  const loadRequests = useCallback(async () => {
    const { data } = await supabase
      .from('week_requests')
      .select('*, profiles(name)')
      .eq('week_start', weekISO)
      .order('submitted_at', { ascending: false })

    setRequests((data || []).map((r: any) => ({
      ...r,
      user_name: r.profiles?.name || r.user_id,
    })))

    const { data: dl } = await supabase
      .from('week_deadlines')
      .select('deadline')
      .eq('week_start', weekISO)
      .single()
    if (dl) setDeadline(dl.deadline)
  }, [weekISO])

  const loadUsers = useCallback(async () => {
    const { data } = await supabase.from('profiles').select('*').order('name')
    setUsers(data || [])
  }, [])

  useEffect(() => { loadRequests() }, [loadRequests])
  useEffect(() => { if (tab === 'users' || tab === 'stats') loadUsers() }, [tab, loadUsers])

  async function approve(req: WeekRequest) {
    const { error } = await supabase
      .from('week_requests')
      .update({ status: 'approved', manager_note: managerNote, updated_at: new Date().toISOString() })
      .eq('id', req.id)
    if (error) toast.error('שגיאה'); else { toast.success('אושר ✓'); loadRequests(); setExpandedId(null) }
  }

  async function reject(req: WeekRequest) {
    if (!managerNote) { toast.error('הוסף הערה לדחייה'); return }
    const { error } = await supabase
      .from('week_requests')
      .update({ status: 'rejected', manager_note: managerNote, updated_at: new Date().toISOString() })
      .eq('id', req.id)
    if (error) toast.error('שגיאה'); else { toast.success('נדחה'); loadRequests(); setExpandedId(null) }
  }

  async function saveDeadline() {
    if (!newDeadline) return
    const { error } = await supabase
      .from('week_deadlines')
      .upsert({ week_start: weekISO, deadline: newDeadline, created_by: profile.id })
    if (error) toast.error('שגיאה'); else { toast.success('דדליין נשמר ✓'); setDeadline(newDeadline); setNewDeadline('') }
  }

  async function createUser() {
    if (!newUser.name || !newUser.email || !newUser.password) {
      toast.error('מלא את כל השדות'); return
    }
    setCreating(true)
    const res = await fetch('/api/users/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newUser),
    })
    const data = await res.json()
    if (data.error) toast.error(data.error)
    else { toast.success('משתמש נוצר ✓'); setNewUser({ name: '', email: '', password: '', role: 'employee' }); loadUsers() }
    setCreating(false)
  }

  const statusColor: Record<string, string> = { pending: '#f5974f', approved: '#2dd4a0', rejected: '#f05c5c' }
  const statusLabel: Record<string, string> = { pending: 'ממתין', approved: '✓ אושר', rejected: '✕ נדחה' }
  const approvedReqs = requests.filter(r => r.status === 'approved')

  const TABS: [Tab, string][] = [
    ['requests', '📋 בקשות'],
    ['schedule', '📅 סידור'],
    ['users', '👥 עובדים'],
    ['stats', '📊 סטטיסטיקות'],
    ['settings', '⚙️ הגדרות'],
  ]

  return (
    <div>
      {/* Tabs */}
      <div className="flex gap-2 mb-6 flex-wrap">
        {TABS.map(([t, label]) => (
          <button key={t} onClick={() => setTab(t)}
            className="px-4 py-2 rounded-lg text-sm font-bold transition-all"
            style={{
              background: tab === t ? '#4f7ef8' : '#222638',
              border: `1px solid ${tab === t ? '#4f7ef8' : '#2e3350'}`,
              color: tab === t ? '#fff' : '#7a7f9e',
            }}>
            {label}
          </button>
        ))}
      </div>

      {/* Week nav (for requests + schedule) */}
      {(tab === 'requests' || tab === 'schedule') && (
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-lg font-black text-white">שבוע {getWeekTitle(weekStart)}</h2>
            {deadline && (
              <div className="text-xs mt-0.5" style={{ color: '#7a7f9e' }}>
                ⏰ דדליין: {new Date(deadline).toLocaleString('he-IL')}
              </div>
            )}
          </div>
          <div className="flex gap-2">
            <button onClick={() => setWeekOffset(o => o - 1)} className="w-8 h-8 rounded-lg font-bold"
              style={{ background: '#222638', border: '1px solid #2e3350', color: '#e8eaf6' }}>›</button>
            <button onClick={() => setWeekOffset(0)} className="px-3 h-8 rounded-lg text-xs font-bold"
              style={{ background: '#222638', border: '1px solid #2e3350', color: '#7a7f9e' }}>היום</button>
            <button onClick={() => setWeekOffset(o => o + 1)} className="w-8 h-8 rounded-lg font-bold"
              style={{ background: '#222638', border: '1px solid #2e3350', color: '#e8eaf6' }}>‹</button>
          </div>
        </div>
      )}

      {/* === REQUESTS === */}
      {tab === 'requests' && (
        <div className="space-y-3">
          {requests.length === 0 ? (
            <div className="text-center py-16 rounded-xl" style={{ background: '#1a1d27', border: '1px solid #2e3350' }}>
              <div className="text-4xl mb-3">📭</div>
              <p className="font-semibold" style={{ color: '#7a7f9e' }}>אין בקשות לשבוע זה</p>
            </div>
          ) : requests.map(req => {
            const v = validateRequest(req.selections || [])
            const counts = countByCategory(req.selections || [])
            const isOpen = expandedId === req.id

            return (
              <div key={req.id} className="rounded-xl overflow-hidden"
                style={{ border: `1px solid ${v.errors.length > 0 ? '#f05c5c' : statusColor[req.status] || '#2e3350'}`, background: '#1a1d27' }}>
                {/* Header */}
                <div className="flex items-center justify-between p-4 cursor-pointer"
                  onClick={() => setExpandedId(isOpen ? null : req.id)}>
                  <div>
                    <div className="font-black text-white">{req.user_name}</div>
                    <div className="text-xs mt-0.5" style={{ color: '#7a7f9e' }}>
                      {counts.morning} בקרים · {counts.noon} צהריים · {counts.night} לילות
                      {counts.rotation > 0 ? ` · ${counts.rotation} שישי בוקר` : ''}
                      {counts.premium > 0 ? ` · ${counts.premium} ⭐` : ''}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {v.errors.length > 0 && (
                      <span className="text-xs font-bold px-2 py-1 rounded-full"
                        style={{ background: 'rgba(240,92,92,.15)', color: '#f05c5c' }}>
                        {v.errors.length} שגיאות
                      </span>
                    )}
                    <span className="text-xs font-bold px-3 py-1 rounded-full"
                      style={{ background: `rgba(${req.status === 'approved' ? '45,212,160' : req.status === 'rejected' ? '240,92,92' : '245,151,79'},.15)`, color: statusColor[req.status] }}>
                      {statusLabel[req.status]}
                    </span>
                    <span style={{ color: '#7a7f9e' }}>{isOpen ? '▲' : '▼'}</span>
                  </div>
                </div>

                {/* Expanded */}
                {isOpen && (
                  <div className="px-4 pb-4 border-t" style={{ borderColor: '#2e3350' }}>
                    {/* Validation errors */}
                    {v.errors.length > 0 && (
                      <div className="rounded-lg p-3 mt-3 mb-3 space-y-1"
                        style={{ background: 'rgba(240,92,92,.08)', border: '1px solid #f05c5c' }}>
                        {v.errors.map((e, i) => (
                          <div key={i} className="text-xs flex gap-2" style={{ color: '#f05c5c' }}>
                            <span>❌</span><span>{e}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Selections grid */}
                    <div className="overflow-x-auto mt-3">
                      <table className="w-full text-xs" style={{ borderCollapse: 'collapse', minWidth: '500px' }}>
                        <thead>
                          <tr>
                            <th className="p-2 text-right font-bold" style={{ color: '#7a7f9e' }}>משמרת</th>
                            {DAYS_SHORT.map(d => (
                              <th key={d} className="p-2 text-center font-bold" style={{ color: '#7a7f9e' }}>{d}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {SHIFTS.map(sh => {
                            const hasAny = (req.selections || []).some(s => s.shift_id === sh.id)
                            if (!hasAny) return null
                            return (
                              <tr key={sh.id}>
                                <td className="p-2 font-semibold" style={{ color: '#e8eaf6' }}>{sh.label}</td>
                                {weekDates.map((_, di) => {
                                  const sel = (req.selections || []).find(s => s.day_index === di && s.shift_id === sh.id)
                                  return (
                                    <td key={di} className="p-2 text-center"
                                      style={{
                                        background: sel
                                          ? sh.category === 'premium' ? 'rgba(245,200,66,.1)' : 'rgba(79,126,248,.1)'
                                          : 'transparent',
                                        color: sel ? (sh.category === 'premium' ? '#f5c842' : '#4f7ef8') : '#3d4060',
                                      }}>
                                      {sel ? '✓' : ''}
                                      {sel?.note ? <div className="text-xs" style={{ color: '#f5974f', fontSize: '9px' }}>{sel.note}</div> : null}
                                    </td>
                                  )
                                })}
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>

                    {/* Actions */}
                    {req.status === 'pending' && (
                      <div className="mt-4 space-y-2">
                        <input
                          type="text"
                          placeholder="הערת מנהל (חובה לדחייה)"
                          value={managerNote}
                          onChange={e => setManagerNote(e.target.value)}
                          className="w-full px-3 py-2 rounded-lg text-sm"
                          style={{ background: '#0f1117', border: '1px solid #2e3350', color: '#e8eaf6', outline: 'none' }}
                        />
                        <div className="flex gap-2">
                          <button onClick={() => approve(req)} disabled={v.errors.length > 0}
                            className="flex-1 py-2.5 rounded-lg font-bold text-sm text-white transition-opacity"
                            style={{ background: '#2dd4a0', opacity: v.errors.length > 0 ? 0.4 : 1 }}>
                            ✓ אשר
                          </button>
                          <button onClick={() => reject(req)}
                            className="flex-1 py-2.5 rounded-lg font-bold text-sm transition-all"
                            style={{ background: 'transparent', border: '1px solid #f05c5c', color: '#f05c5c' }}>
                            ✕ דחה
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* === SCHEDULE === */}
      {tab === 'schedule' && (
        <div>
          {approvedReqs.length === 0 ? (
            <div className="text-center py-16 rounded-xl" style={{ background: '#1a1d27', border: '1px solid #2e3350' }}>
              <div className="text-4xl mb-3">📅</div>
              <p className="font-semibold" style={{ color: '#7a7f9e' }}>אין בקשות מאושרות לשבוע זה</p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl" style={{ border: '1px solid #2e3350' }}>
              <table style={{ borderCollapse: 'collapse', width: '100%', minWidth: '700px', fontSize: '12px' }}>
                <thead>
                  <tr style={{ background: '#222638' }}>
                    <th className="p-3 text-right font-bold" style={{ color: '#7a7f9e', borderBottom: '1px solid #2e3350' }}>עובד</th>
                    {weekDates.map((d, i) => (
                      <th key={i} className="p-3 text-center font-bold" style={{ color: i >= 5 ? '#a07ce8' : '#7a7f9e', borderBottom: '1px solid #2e3350' }}>
                        {DAYS_HE[i]}<br />{formatDateHE(d)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {approvedReqs.map(req => (
                    <tr key={req.id} style={{ borderBottom: '1px solid #2e3350' }}>
                      <td className="p-3 font-bold" style={{ background: '#1a1d27', color: '#e8eaf6' }}>
                        {req.user_name}
                      </td>
                      {weekDates.map((_, di) => {
                        const dayShifts = (req.selections || []).filter(s => s.day_index === di)
                        return (
                          <td key={di} className="p-2" style={{ background: '#1a1d27', verticalAlign: 'top' }}>
                            {dayShifts.map(sel => {
                              const sh = SHIFTS.find(s => s.id === sel.shift_id)
                              if (!sh) return null
                              return (
                                <div key={sel.shift_id} className="rounded px-1.5 py-0.5 text-xs font-bold mb-1"
                                  style={{
                                    background: sh.category === 'premium' ? 'rgba(245,200,66,.15)' : sh.category === 'rotation' ? 'rgba(124,92,191,.15)' : 'rgba(79,126,248,.12)',
                                    color: sh.category === 'premium' ? '#f5c842' : sh.category === 'rotation' ? '#a07ce8' : '#4f7ef8',
                                    fontSize: '10px',
                                  }}>
                                  {sh.label}
                                  {sel.note && <div style={{ color: '#f5974f', fontSize: '9px' }}>{sel.note}</div>}
                                </div>
                              )
                            })}
                          </td>
                        )
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* === USERS === */}
      {tab === 'users' && (
        <div className="space-y-5">
          {/* Create user form */}
          <div className="rounded-xl p-5" style={{ background: '#1a1d27', border: '1px solid #2e3350' }}>
            <h3 className="font-black text-white mb-4">➕ יצירת עובד חדש</h3>
            <div className="grid grid-cols-2 gap-3 mb-3">
              <div>
                <label className="text-xs font-bold mb-1 block" style={{ color: '#7a7f9e' }}>שם מלא</label>
                <input value={newUser.name} onChange={e => setNewUser(u => ({ ...u, name: e.target.value }))}
                  placeholder="ישראל ישראלי"
                  className="w-full px-3 py-2.5 rounded-lg text-sm"
                  style={{ background: '#0f1117', border: '1px solid #2e3350', color: '#e8eaf6', outline: 'none' }} />
              </div>
              <div>
                <label className="text-xs font-bold mb-1 block" style={{ color: '#7a7f9e' }}>אימייל</label>
                <input value={newUser.email} onChange={e => setNewUser(u => ({ ...u, email: e.target.value }))}
                  placeholder="israel@example.com" type="email"
                  className="w-full px-3 py-2.5 rounded-lg text-sm"
                  style={{ background: '#0f1117', border: '1px solid #2e3350', color: '#e8eaf6', outline: 'none' }} />
              </div>
              <div>
                <label className="text-xs font-bold mb-1 block" style={{ color: '#7a7f9e' }}>סיסמה זמנית</label>
                <input value={newUser.password} onChange={e => setNewUser(u => ({ ...u, password: e.target.value }))}
                  placeholder="לפחות 6 תווים" type="text"
                  className="w-full px-3 py-2.5 rounded-lg text-sm"
                  style={{ background: '#0f1117', border: '1px solid #2e3350', color: '#e8eaf6', outline: 'none' }} />
              </div>
              <div>
                <label className="text-xs font-bold mb-1 block" style={{ color: '#7a7f9e' }}>תפקיד</label>
                <select value={newUser.role} onChange={e => setNewUser(u => ({ ...u, role: e.target.value as any }))}
                  className="w-full px-3 py-2.5 rounded-lg text-sm"
                  style={{ background: '#0f1117', border: '1px solid #2e3350', color: '#e8eaf6', outline: 'none' }}>
                  <option value="employee">עובד</option>
                  <option value="manager">מנהל</option>
                </select>
              </div>
            </div>
            <button onClick={createUser} disabled={creating}
              className="w-full py-3 rounded-lg font-bold text-white transition-opacity"
              style={{ background: 'linear-gradient(135deg, #4f7ef8, #7c5cbf)', opacity: creating ? 0.6 : 1 }}>
              {creating ? 'יוצר...' : '➕ צור משתמש'}
            </button>
          </div>

          {/* Users list */}
          <div className="rounded-xl overflow-hidden" style={{ border: '1px solid #2e3350' }}>
            <div className="p-4" style={{ background: '#222638', borderBottom: '1px solid #2e3350' }}>
              <h3 className="font-black text-white">👥 כל העובדים ({users.length})</h3>
            </div>
            {users.map(u => (
              <div key={u.id} className="flex items-center justify-between px-4 py-3"
                style={{ borderBottom: '1px solid #2e3350', background: '#1a1d27' }}>
                <div>
                  <div className="font-bold text-sm text-white">{u.name}</div>
                  <div className="text-xs" style={{ color: '#7a7f9e' }}>{u.email}</div>
                </div>
                <span className="text-xs px-2.5 py-1 rounded-full font-bold"
                  style={{
                    background: u.role === 'manager' ? 'rgba(245,200,66,.15)' : 'rgba(79,126,248,.15)',
                    color: u.role === 'manager' ? '#f5c842' : '#4f7ef8',
                  }}>
                  {u.role === 'manager' ? '👑 מנהל' : '👤 עובד'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* === STATS === */}
      {tab === 'stats' && (
        <div>
          <h2 className="text-lg font-black text-white mb-4">📊 סטטיסטיקות עובדים – חודש אחרון</h2>
          <StatsTable users={users} supabase={supabase} />
        </div>
      )}

      {/* === SETTINGS === */}
      {tab === 'settings' && (
        <div className="space-y-4">
          <div className="rounded-xl p-5" style={{ background: '#1a1d27', border: '1px solid #2e3350' }}>
            <h3 className="font-black text-white mb-4">⏰ קביעת דדליין להגשה</h3>
            <p className="text-xs mb-3" style={{ color: '#7a7f9e' }}>
              שבוע נוכחי: {getWeekTitle(weekStart)}
              {deadline && <span> · דדליין נוכחי: {new Date(deadline).toLocaleString('he-IL')}</span>}
            </p>
            <div className="flex gap-3">
              <input
                type="datetime-local"
                value={newDeadline}
                onChange={e => setNewDeadline(e.target.value)}
                className="flex-1 px-3 py-2.5 rounded-lg text-sm"
                style={{ background: '#0f1117', border: '1px solid #2e3350', color: '#e8eaf6', outline: 'none' }}
              />
              <button onClick={saveDeadline}
                className="px-5 py-2.5 rounded-lg font-bold text-white"
                style={{ background: '#4f7ef8' }}>
                שמור
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// Stats sub-component
function StatsTable({ users, supabase }: { users: User[], supabase: any }) {
  const [stats, setStats] = useState<any[]>([])

  useEffect(() => {
    async function load() {
      const oneMonthAgo = new Date()
      oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1)
      const { data } = await supabase
        .from('week_requests')
        .select('user_id, selections, profiles(name)')
        .eq('status', 'approved')
        .gte('week_start', oneMonthAgo.toISOString().split('T')[0])

      if (!data) return
      // Aggregate by user
      const agg: Record<string, any> = {}
      for (const req of data) {
        const uid = req.user_id
        const name = req.profiles?.name || uid
        if (!agg[uid]) agg[uid] = { name, morning: 0, noon: 0, night: 0, rotation: 0, premium: 0, total: 0 }
        const counts = countByCategory(req.selections || [])
        agg[uid].morning += counts.morning
        agg[uid].noon += counts.noon
        agg[uid].night += counts.night
        agg[uid].rotation += counts.rotation
        agg[uid].premium += counts.premium
        agg[uid].total += (req.selections || []).length
      }
      setStats(Object.values(agg).sort((a: any, b: any) => b.total - a.total))
    }
    load()
  }, [users])

  if (stats.length === 0) return (
    <div className="text-center py-12 rounded-xl" style={{ background: '#1a1d27', border: '1px solid #2e3350', color: '#7a7f9e' }}>
      אין נתונים
    </div>
  )

  return (
    <div className="overflow-x-auto rounded-xl" style={{ border: '1px solid #2e3350' }}>
      <table style={{ borderCollapse: 'collapse', width: '100%', fontSize: '13px' }}>
        <thead>
          <tr style={{ background: '#222638' }}>
            {['עובד', 'בקרים', 'צהריים', 'לילות', 'שישי בוקר', '⭐ איכויות', 'סה"כ'].map(h => (
              <th key={h} className="p-3 text-center font-bold" style={{ color: '#7a7f9e', borderBottom: '1px solid #2e3350' }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {stats.map((s: any, i: number) => (
            <tr key={i} style={{ borderBottom: '1px solid #2e3350', background: '#1a1d27' }}>
              <td className="p-3 font-bold" style={{ color: '#e8eaf6' }}>{s.name}</td>
              <td className="p-3 text-center" style={{ color: '#4f7ef8' }}>{s.morning}</td>
              <td className="p-3 text-center" style={{ color: '#2dd4a0' }}>{s.noon}</td>
              <td className="p-3 text-center" style={{ color: '#f05c5c' }}>{s.night}</td>
              <td className="p-3 text-center" style={{ color: '#a07ce8' }}>{s.rotation}</td>
              <td className="p-3 text-center" style={{ color: '#f5c842' }}>{s.premium}</td>
              <td className="p-3 text-center font-black" style={{ color: '#e8eaf6' }}>{s.total}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
