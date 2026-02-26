'use client'
import { useState, useEffect, useCallback, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { WeekRequest, User, ShiftSelection } from '@/types'
import { validateRequest, countByCategory } from '@/lib/validation'
import { getWeekStart, getWeekDates, weekStartToISO, getWeekTitle, offsetWeek, formatDateHE } from '@/lib/week'
import { SHIFTS, DAYS_HE, DAYS_SHORT, getShiftById } from '@/lib/shifts'
import ShiftPicker from '@/components/shifts/ShiftPicker'
import toast from 'react-hot-toast'

interface Props { profile: User }
type Tab = 'requests' | 'schedule' | 'my_request' | 'users' | 'stats' | 'swaps'

const isManager = (role: string) => role === 'manager'
const canManage = (role: string) => role === 'manager' || role === 'shift_manager'

const ROLE_LABELS: Record<string, string> = {
  manager: 'מנהל',
  shift_manager: 'אחמש',
  employee: 'עובד',
}
const ROLE_COLORS: Record<string, string> = {
  manager: '#f5c842',
  shift_manager: '#a07ce8',
  employee: '#4f7ef8',
}

function getAutoDeadline(weekStart: Date): string {
  const d = new Date(weekStart)
  d.setDate(d.getDate() + 2)
  d.setHours(12, 0, 0, 0)
  return d.toISOString()
}

export default function ManagerDashboard({ profile }: Props) {
  const [tab, setTab] = useState<Tab>('requests')
  const [weekOffset, setWeekOffset] = useState(0)
  const [requests, setRequests] = useState<WeekRequest[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [managerNote, setManagerNote] = useState('')
  const [newUser, setNewUser] = useState({ name: '', email: '', password: '', role: 'employee' })
  const [creating, setCreating] = useState(false)
  // Manual schedule assignment
  const [manualAssignments, setManualAssignments] = useState<Record<string, ShiftSelection[]>>({})
  // My own request
  const [mySelections, setMySelections] = useState<ShiftSelection[]>([])
  const [myRequest, setMyRequest] = useState<WeekRequest | null>(null)
  const [submittingMy, setSubmittingMy] = useState(false)
  // Briefings (תדריך)
  const [briefings, setBriefings] = useState<Record<number, string>>({})
  // Swap requests for manager approval
  const [swapRequests, setSwapRequests] = useState<any[]>([])
  const scheduleRef = useRef<HTMLDivElement>(null)
  const supabase = createClient()

  const weekStart = offsetWeek(getWeekStart(), weekOffset)
  const weekDates = getWeekDates(weekStart)
  const weekISO = weekStartToISO(weekStart)
  const deadline = getAutoDeadline(weekStart)

  const loadRequests = useCallback(async () => {
    const { data } = await supabase
      .from('week_requests')
      .select('*, profiles(name)')
      .eq('week_start', weekISO)
      .order('submitted_at', { ascending: false })
    setRequests((data || []).map((r: any) => ({ ...r, user_name: r.profiles?.name || r.user_id })))

    // Load briefings
    const { data: br } = await supabase
      .from('daily_briefings')
      .select('*')
      .eq('week_start', weekISO)
    if (br) {
      const bMap: Record<number, string> = {}
      br.forEach((b: any) => { bMap[b.day_index] = b.briefing_person })
      setBriefings(bMap)
    }

    // Load manual assignments
    const { data: ma } = await supabase
      .from('manual_assignments')
      .select('*, profiles(name)')
      .eq('week_start', weekISO)
    if (ma) {
      const aMap: Record<string, ShiftSelection[]> = {}
      ma.forEach((a: any) => {
        if (!aMap[a.user_id]) aMap[a.user_id] = []
        aMap[a.user_id] = a.selections || []
      })
      setManualAssignments(aMap)
    }
  }, [weekISO])

  const loadUsers = useCallback(async () => {
    const { data } = await supabase.from('profiles').select('*').order('name')
    setUsers(data || [])
  }, [])

  const loadMyRequest = useCallback(async () => {
    const { data } = await supabase
      .from('week_requests')
      .select('*')
      .eq('user_id', profile.id)
      .eq('week_start', weekISO)
      .single()
    if (data) { setMyRequest(data); setMySelections(data.selections || []) }
    else { setMyRequest(null); setMySelections([]) }
  }, [weekISO, profile.id])

  const loadSwaps = useCallback(async () => {
    const { data } = await supabase
      .from('swap_requests')
      .select('*, requester:profiles!swap_requests_requester_id_fkey(name), target:profiles!swap_requests_target_id_fkey(name)')
      .eq('status', 'accepted')
      .order('created_at', { ascending: false })
    setSwapRequests(data || [])
  }, [])

  useEffect(() => { loadRequests() }, [loadRequests])
  useEffect(() => { if (tab === 'users' || tab === 'stats' || tab === 'schedule') loadUsers() }, [tab, loadUsers])
  useEffect(() => { if (tab === 'my_request') loadMyRequest() }, [tab, loadMyRequest])
  useEffect(() => { if (tab === 'swaps') loadSwaps() }, [tab, loadSwaps])

  async function approve(req: WeekRequest) {
    const res = await fetch('/api/requests/approve', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ requestId: req.id, managerNote }),
    })
    const data = await res.json()
    if (data.error) toast.error(data.error)
    else { toast.success('אושר'); loadRequests(); setExpandedId(null); setManagerNote('') }
  }

  async function reject(req: WeekRequest) {
    if (!managerNote) { toast.error('הוסף הערה לדחייה'); return }
    const res = await fetch('/api/requests/reject', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ requestId: req.id, managerNote }),
    })
    const data = await res.json()
    if (data.error) toast.error(data.error)
    else { toast.success('נדחה'); loadRequests(); setExpandedId(null); setManagerNote('') }
  }

  async function createUser() {
    if (!newUser.name || !newUser.email || !newUser.password) { toast.error('מלא את כל השדות'); return }
    setCreating(true)
    const res = await fetch('/api/users/create', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(newUser),
    })
    const data = await res.json()
    if (data.error) toast.error(data.error)
    else { toast.success('משתמש נוצר'); setNewUser({ name: '', email: '', password: '', role: 'employee' }); loadUsers() }
    setCreating(false)
  }

  async function deleteUser(userId: string, name: string) {
    if (!confirm(`האם למחוק את ${name}? לא ניתן לבטל פעולה זו.`)) return
    const res = await fetch('/api/users/delete', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId }),
    })
    const data = await res.json()
    if (data.error) toast.error(data.error); else { toast.success('עובד הוסר'); loadUsers() }
  }

  async function changeRole(userId: string, role: string) {
    const res = await fetch('/api/users/update-role', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId, role }),
    })
    const data = await res.json()
    if (data.error) toast.error(data.error); else { toast.success('תפקיד עודכן'); loadUsers() }
  }

  async function saveBriefing(dayIndex: number, person: string) {
    await supabase.from('daily_briefings').upsert({
      week_start: weekISO, day_index: dayIndex, briefing_person: person,
    }, { onConflict: 'week_start,day_index' })
    setBriefings(prev => ({ ...prev, [dayIndex]: person }))
  }

  async function saveManualAssignment(userId: string, selections: ShiftSelection[]) {
    await supabase.from('manual_assignments').upsert({
      week_start: weekISO, user_id: userId, selections,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'week_start,user_id' })
    setManualAssignments(prev => ({ ...prev, [userId]: selections }))
    toast.success('שיבוץ ידני נשמר')
  }

  async function submitMyRequest() {
    const v = validateRequest(mySelections)
    if (!v.valid) { toast.error('תקן שגיאות לפני שליחה'); return }
    setSubmittingMy(true)
    const res = await fetch('/api/requests/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ week_start: weekISO, selections: mySelections }),
    })
    const data = await res.json()
    if (data.error) {
      toast.error(data.error)
    } else {
      toast.success('המשמרות שלך נשמרו')
      await loadMyRequest()
    }
    setSubmittingMy(false)
  }

  async function approveSwap(swapId: string) {
    const res = await fetch('/api/swap/approve', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ swapId, approve: true }),
    })
    const data = await res.json()
    if (data.error) toast.error(data.error)
    else { toast.success('החלפה אושרה'); loadSwaps() }
  }

  async function rejectSwap(swapId: string) {
    const res = await fetch('/api/swap/approve', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ swapId, approve: false }),
    })
    const data = await res.json()
    if (data.error) toast.error(data.error)
    else { toast.success('החלפה נדחתה'); loadSwaps() }
  }

  function shareWhatsApp() {
    const url = window.location.href
    window.open(`https://wa.me/?text=סידור עבודה שבוע ${getWeekTitle(weekStart)}: ${url}`, '_blank')
  }

  const statusColor: Record<string, string> = { pending: '#f5974f', approved: '#2dd4a0', rejected: '#f05c5c' }
  const statusLabel: Record<string, string> = { pending: 'ממתין', approved: 'אושר', rejected: 'נדחה' }
  const approvedReqs = requests.filter(r => r.status === 'approved')

  const TABS: [Tab, string][] = [
    ['requests', 'בקשות'],
    ['schedule', 'סידור'],
    ['my_request', 'המשמרות שלי'],
    ['swaps', 'החלפות'],
    ['users', 'עובדים'],
    ['stats', 'סטטיסטיקות'],
  ]

  return (
    <div>
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

      {/* Week nav */}
      {['requests', 'schedule', 'my_request'].includes(tab) && (
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-lg font-black text-white">שבוע {getWeekTitle(weekStart)}</h2>
            <div className="text-xs mt-0.5" style={{ color: '#7a7f9e' }}>
              דדליין: {new Date(deadline).toLocaleString('he-IL')}
            </div>
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
              <p className="font-semibold" style={{ color: '#7a7f9e' }}>אין בקשות לשבוע זה</p>
            </div>
          ) : requests.map(req => {
            const v = validateRequest(req.selections || [])
            const counts = countByCategory(req.selections || [])
            const isOpen = expandedId === req.id
            return (
              <div key={req.id} className="rounded-xl overflow-hidden"
                style={{ border: `1px solid ${v.errors.length > 0 ? '#f05c5c' : statusColor[req.status] || '#2e3350'}`, background: '#1a1d27' }}>
                <div className="flex items-center justify-between p-4 cursor-pointer"
                  onClick={() => { setExpandedId(isOpen ? null : req.id); setManagerNote('') }}>
                  <div>
                    <div className="font-black text-white">{req.user_name}</div>
                    <div className="text-xs mt-0.5" style={{ color: '#7a7f9e' }}>
                      {counts.morning} בקרים · {counts.noon} צהריים · {counts.evening} ערב · {counts.night} לילות
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
                      style={{ background: `${statusColor[req.status]}22`, color: statusColor[req.status] }}>
                      {statusLabel[req.status]}
                    </span>
                    <span style={{ color: '#7a7f9e' }}>{isOpen ? '▲' : '▼'}</span>
                  </div>
                </div>

                {isOpen && (
                  <div className="px-4 pb-4 border-t" style={{ borderColor: '#2e3350' }}>
                    {v.errors.length > 0 && (
                      <div className="rounded-lg p-3 mt-3 mb-3 space-y-1"
                        style={{ background: 'rgba(240,92,92,.08)', border: '1px solid #f05c5c' }}>
                        {v.errors.map((e, i) => (
                          <div key={i} className="text-xs" style={{ color: '#f05c5c' }}>{e}</div>
                        ))}
                      </div>
                    )}
                    <div className="overflow-x-auto mt-3">
                      <table className="w-full text-xs" style={{ borderCollapse: 'collapse', minWidth: '500px' }}>
                        <thead>
                          <tr>
                            <th className="p-2 text-right font-bold" style={{ color: '#7a7f9e' }}>משמרת</th>
                            {DAYS_SHORT.map(d => <th key={d} className="p-2 text-center font-bold" style={{ color: '#7a7f9e' }}>{d}</th>)}
                          </tr>
                        </thead>
                        <tbody>
                          {SHIFTS.filter(sh => sh.category !== 'manager_only').map(sh => {
                            const hasAny = (req.selections || []).some(s => s.shift_id === sh.id)
                            if (!hasAny) return null
                            return (
                              <tr key={sh.id}>
                                <td className="p-2 font-semibold" style={{ color: '#e8eaf6' }}>{sh.label} {sh.time}</td>
                                {weekDates.map((_, di) => {
                                  const sel = (req.selections || []).find(s => s.day_index === di && s.shift_id === sh.id)
                                  return (
                                    <td key={di} className="p-2 text-center" style={{ color: sel ? '#4f7ef8' : '#3d4060' }}>
                                      {sel ? 'V' : ''}
                                      {sel?.note ? <div style={{ color: '#f5974f', fontSize: '9px' }}>{sel.note}</div> : null}
                                    </td>
                                  )
                                })}
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>
                    {req.status === 'pending' && (
                      <div className="mt-4 space-y-2">
                        <input type="text" placeholder="הערת מנהל (חובה לדחייה)" value={managerNote}
                          onChange={e => setManagerNote(e.target.value)}
                          className="w-full px-3 py-2 rounded-lg text-sm"
                          style={{ background: '#0f1117', border: '1px solid #2e3350', color: '#e8eaf6', outline: 'none' }} />
                        <div className="flex gap-2">
                          <button onClick={() => approve(req)} disabled={v.errors.length > 0}
                            className="flex-1 py-2.5 rounded-lg font-bold text-sm text-white"
                            style={{ background: '#2dd4a0', opacity: v.errors.length > 0 ? 0.4 : 1 }}>
                            אשר
                          </button>
                          <button onClick={() => reject(req)}
                            className="flex-1 py-2.5 rounded-lg font-bold text-sm"
                            style={{ background: 'transparent', border: '1px solid #f05c5c', color: '#f05c5c' }}>
                            דחה
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
          <div className="flex gap-2 mb-4">
            <button onClick={shareWhatsApp}
              className="px-4 py-2 rounded-lg font-bold text-sm text-white"
              style={{ background: '#25D366' }}>
              שלח לוואטסאפ
            </button>
          </div>

          {/* Schedule table */}
          <div ref={scheduleRef} className="overflow-x-auto rounded-xl" style={{ border: '1px solid #2e3350', background: '#1a1d27' }}>
            <table style={{ borderCollapse: 'collapse', width: '100%', minWidth: '700px', fontSize: '12px' }}>
              <thead>
                <tr style={{ background: '#222638' }}>
                  <th className="p-3 text-right font-bold" style={{ color: '#7a7f9e', borderBottom: '1px solid #2e3350' }}>
                    שם
                  </th>
                  {weekDates.map((d, i) => (
                    <th key={i} className="p-2 text-center font-bold" style={{ color: i >= 5 ? '#a07ce8' : '#7a7f9e', borderBottom: '1px solid #2e3350', minWidth: '90px' }}>
                      {DAYS_HE[i]}<br />
                      <span style={{ fontWeight: 400, fontSize: '10px' }}>{formatDateHE(d)}</span>
                    </th>
                  ))}
                </tr>
                {/* Briefing row */}
                <tr style={{ background: '#1a1d27' }}>
                  <td className="p-2 text-xs font-bold" style={{ color: '#f5c842', borderBottom: '1px solid #2e3350' }}>
                    תדריך
                  </td>
                  {weekDates.map((_, i) => (
                    <td key={i} className="p-1" style={{ borderBottom: '1px solid #2e3350' }}>
                      <input
                        value={briefings[i] || ''}
                        onChange={e => setBriefings(prev => ({ ...prev, [i]: e.target.value }))}
                        onBlur={e => saveBriefing(i, e.target.value)}
                        placeholder="שם..."
                        className="w-full px-1.5 py-1 rounded text-xs text-center"
                        style={{ background: '#222638', border: '1px solid #2e3350', color: '#f5c842', outline: 'none', fontSize: '10px' }}
                      />
                    </td>
                  ))}
                </tr>
              </thead>
              <tbody>
                {approvedReqs.length === 0 ? (
                  <tr><td colSpan={8} className="p-8 text-center" style={{ color: '#7a7f9e' }}>אין בקשות מאושרות</td></tr>
                ) : approvedReqs.map(req => (
                  <tr key={req.id} style={{ borderBottom: '1px solid #2e3350' }}>
                    <td className="p-3 font-bold" style={{ background: '#1a1d27', color: '#e8eaf6' }}>{req.user_name}</td>
                    {weekDates.map((_, di) => {
                      const dayShifts = (req.selections || []).filter(s => s.day_index === di)
                      return (
                        <td key={di} className="p-2" style={{ background: '#1a1d27', verticalAlign: 'top' }}>
                          {dayShifts.map(sel => {
                            const sh = getShiftById(sel.shift_id)
                            if (!sh) return null
                            const colors: Record<string, string> = { morning: '#4f7ef8', noon: '#2dd4a0', evening: '#f5974f', night: '#f05c5c' }
                            const c = colors[sh.type] || '#7a7f9e'
                            return (
                              <div key={sel.shift_id} className="rounded px-1.5 py-0.5 mb-1 text-xs font-bold"
                                style={{ background: `${c}18`, color: c, fontSize: '10px' }}>
                                {sh.time}
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

          {/* Manual assignments section */}
          {canManage(profile.role) && (
            <div className="mt-6">
              <h3 className="font-black text-white mb-3">שיבוץ ידני</h3>
              <div className="space-y-3">
                {users.map(u => (
                  <div key={u.id} className="rounded-xl p-4" style={{ background: '#1a1d27', border: '1px solid #2e3350' }}>
                    <div className="flex items-center justify-between mb-3">
                      <span className="font-bold text-sm text-white">{u.name}</span>
                      <button onClick={() => saveManualAssignment(u.id, manualAssignments[u.id] || [])}
                        className="px-3 py-1 rounded-lg text-xs font-bold text-white"
                        style={{ background: '#4f7ef8' }}>שמור</button>
                    </div>
                    <ShiftPicker
                      weekDates={weekDates}
                      selections={manualAssignments[u.id] || []}
                      onChange={sels => setManualAssignments(prev => ({ ...prev, [u.id]: sels }))}
                      managerView={true}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* === MY REQUEST === */}
      {tab === 'my_request' && (
        <div>
          <p className="text-sm mb-4" style={{ color: '#7a7f9e' }}>
            כמנהל/אחמש, המשמרות שלך מאושרות אוטומטית.
          </p>
          {myRequest && (
            <div className="rounded-xl p-3 mb-4"
              style={{ background: 'rgba(45,212,160,.1)', border: '1px solid #2dd4a0' }}>
              <span className="font-bold text-sm" style={{ color: '#2dd4a0' }}>משמרות קיימות לשבוע זה</span>
            </div>
          )}
          <div className="rounded-xl p-4 mb-4" style={{ background: '#1a1d27', border: '1px solid #2e3350' }}>
            <ShiftPicker
              weekDates={weekDates}
              selections={mySelections}
              onChange={setMySelections}
              managerView={true}
            />
          </div>
          <button onClick={submitMyRequest} disabled={submittingMy}
            className="w-full py-4 rounded-xl font-black text-lg text-white"
            style={{ background: 'linear-gradient(135deg, #4f7ef8, #7c5cbf)', opacity: submittingMy ? 0.6 : 1 }}>
            {submittingMy ? 'שומר...' : 'שמור משמרות'}
          </button>
        </div>
      )}

      {/* === SWAPS === */}
      {tab === 'swaps' && (
        <div className="space-y-3">
          <h2 className="text-lg font-black text-white mb-4">בקשות החלפה לאישור</h2>
          {swapRequests.length === 0 ? (
            <div className="text-center py-16 rounded-xl" style={{ background: '#1a1d27', border: '1px solid #2e3350', color: '#7a7f9e' }}>
              אין בקשות החלפה ממתינות לאישור
            </div>
          ) : swapRequests.map(swap => {
            const rs = swap.requester_shift
            const ts = swap.target_shift
            const rsh = rs ? getShiftById(rs.shift_id) : null
            const tsh = ts ? getShiftById(ts.shift_id) : null
            return (
              <div key={swap.id} className="rounded-xl p-4" style={{ background: '#1a1d27', border: '1px solid #f5974f' }}>
                <p className="text-sm text-white mb-1">
                  {swap.requester?.name} רוצה להחליף עם {swap.target?.name}
                </p>
                <p className="text-xs mb-3" style={{ color: '#7a7f9e' }}>
                  {rsh ? `${rsh.label} ${rsh.time}` : ''} יום {rs ? DAYS_HE[rs.day_index] : ''} ←→{' '}
                  {tsh ? `${tsh.label} ${tsh.time}` : ''} יום {ts ? DAYS_HE[ts.day_index] : ''}
                </p>
                <div className="flex gap-2">
                  <button onClick={() => approveSwap(swap.id)}
                    className="flex-1 py-2 rounded-lg font-bold text-sm text-white"
                    style={{ background: '#2dd4a0' }}>אשר</button>
                  <button onClick={() => rejectSwap(swap.id)}
                    className="flex-1 py-2 rounded-lg font-bold text-sm"
                    style={{ background: 'transparent', border: '1px solid #f05c5c', color: '#f05c5c' }}>דחה</button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* === USERS === */}
      {tab === 'users' && (
        <div className="space-y-5">
          {isManager(profile.role) && (
            <div className="rounded-xl p-5" style={{ background: '#1a1d27', border: '1px solid #2e3350' }}>
              <h3 className="font-black text-white mb-4">יצירת עובד חדש</h3>
              <div className="grid grid-cols-2 gap-3 mb-3">
                {[['שם מלא', 'name', 'text', 'ישראל ישראלי'], ['אימייל', 'email', 'email', 'israel@example.com'],
                  ['סיסמה זמנית', 'password', 'text', 'לפחות 6 תווים']].map(([label, field, type, ph]) => (
                  <div key={field}>
                    <label className="text-xs font-bold mb-1 block" style={{ color: '#7a7f9e' }}>{label}</label>
                    <input value={(newUser as any)[field]} onChange={e => setNewUser(u => ({ ...u, [field]: e.target.value }))}
                      placeholder={ph} type={type}
                      className="w-full px-3 py-2.5 rounded-lg text-sm"
                      style={{ background: '#0f1117', border: '1px solid #2e3350', color: '#e8eaf6', outline: 'none' }} />
                  </div>
                ))}
                <div>
                  <label className="text-xs font-bold mb-1 block" style={{ color: '#7a7f9e' }}>תפקיד</label>
                  <select value={newUser.role} onChange={e => setNewUser(u => ({ ...u, role: e.target.value }))}
                    className="w-full px-3 py-2.5 rounded-lg text-sm"
                    style={{ background: '#0f1117', border: '1px solid #2e3350', color: '#e8eaf6', outline: 'none' }}>
                    <option value="employee">עובד</option>
                    <option value="shift_manager">אחמש</option>
                    <option value="manager">מנהל</option>
                  </select>
                </div>
              </div>
              <button onClick={createUser} disabled={creating}
                className="w-full py-3 rounded-lg font-bold text-white"
                style={{ background: 'linear-gradient(135deg, #4f7ef8, #7c5cbf)', opacity: creating ? 0.6 : 1 }}>
                {creating ? 'יוצר...' : 'צור משתמש'}
              </button>
            </div>
          )}

          <div className="rounded-xl overflow-hidden" style={{ border: '1px solid #2e3350' }}>
            <div className="p-4" style={{ background: '#222638', borderBottom: '1px solid #2e3350' }}>
              <h3 className="font-black text-white">כל העובדים ({users.length})</h3>
            </div>
            {users.map(u => (
              <div key={u.id} className="flex items-center justify-between px-4 py-3"
                style={{ borderBottom: '1px solid #2e3350', background: '#1a1d27' }}>
                <div>
                  <div className="font-bold text-sm text-white">{u.name}</div>
                  <div className="text-xs" style={{ color: '#7a7f9e' }}>{u.email}</div>
                </div>
                <div className="flex items-center gap-2">
                  {isManager(profile.role) ? (
                    <select value={u.role}
                      onChange={e => changeRole(u.id, e.target.value)}
                      className="px-2 py-1 rounded-lg text-xs font-bold"
                      style={{ background: `${ROLE_COLORS[u.role]}22`, border: `1px solid ${ROLE_COLORS[u.role]}`, color: ROLE_COLORS[u.role], outline: 'none' }}>
                      <option value="employee">עובד</option>
                      <option value="shift_manager">אחמש</option>
                      <option value="manager">מנהל</option>
                    </select>
                  ) : (
                    <span className="text-xs px-2.5 py-1 rounded-full font-bold"
                      style={{ background: `${ROLE_COLORS[u.role]}22`, color: ROLE_COLORS[u.role] }}>
                      {ROLE_LABELS[u.role]}
                    </span>
                  )}
                  {isManager(profile.role) && u.id !== profile.id && (
                    <button onClick={() => deleteUser(u.id, u.name)}
                      className="px-2 py-1 rounded-lg text-xs font-bold"
                      style={{ background: 'rgba(240,92,92,.1)', border: '1px solid #f05c5c', color: '#f05c5c' }}>
                      הסר
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* === STATS === */}
      {tab === 'stats' && (
        <div>
          <h2 className="text-lg font-black text-white mb-4">סטטיסטיקות - חודש אחרון</h2>
          <StatsTable users={users} supabase={supabase} />
        </div>
      )}
    </div>
  )
}

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
      const agg: Record<string, any> = {}
      for (const req of data) {
        const uid = req.user_id
        const name = req.profiles?.name || uid
        if (!agg[uid]) agg[uid] = { name, morning: 0, noon: 0, evening: 0, night: 0, total: 0 }
        const c = countByCategory(req.selections || [])
        agg[uid].morning += c.morning
        agg[uid].noon += c.noon
        agg[uid].evening += c.evening
        agg[uid].night += c.night
        agg[uid].total += (req.selections || []).length
      }
      setStats(Object.values(agg).sort((a: any, b: any) => b.total - a.total))
    }
    load()
  }, [users])

  if (stats.length === 0) return (
    <div className="text-center py-12 rounded-xl" style={{ background: '#1a1d27', border: '1px solid #2e3350', color: '#7a7f9e' }}>אין נתונים</div>
  )

  return (
    <div className="overflow-x-auto rounded-xl" style={{ border: '1px solid #2e3350' }}>
      <table style={{ borderCollapse: 'collapse', width: '100%', fontSize: '13px' }}>
        <thead>
          <tr style={{ background: '#222638' }}>
            {['עובד', 'בקרים', 'צהריים', 'ערב', 'לילות', 'סה"כ'].map(h => (
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
              <td className="p-3 text-center" style={{ color: '#f5974f' }}>{s.evening}</td>
              <td className="p-3 text-center" style={{ color: '#f05c5c' }}>{s.night}</td>
              <td className="p-3 text-center font-black" style={{ color: '#e8eaf6' }}>{s.total}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
