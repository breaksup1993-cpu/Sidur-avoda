'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { User } from '@/types'
import { getShiftById, DAYS_HE, SHIFTS, getShiftsForDay } from '@/lib/shifts'
import { getWeekStart, getWeekDates, weekStartToISO, offsetWeek } from '@/lib/week'
import toast from 'react-hot-toast'

interface Props { profile: User }

export default function SwapsTab({ profile }: Props) {
  const [mySwaps, setMySwaps] = useState<any[]>([])
  const [incomingSwaps, setIncomingSwaps] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [users, setUsers] = useState<any[]>([])
  const [weekOffset] = useState(0)

  // Form state
  const [targetUser, setTargetUser] = useState('')
  const [myDayIndex, setMyDayIndex] = useState<number>(0)
  const [myShiftId, setMyShiftId] = useState('')
  const [theirDayIndex, setTheirDayIndex] = useState<number>(0)
  const [theirShiftId, setTheirShiftId] = useState('')
  const [note, setNote] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const supabase = createClient()
  const weekStart = offsetWeek(getWeekStart(), weekOffset)
  const weekISO = weekStartToISO(weekStart)
  const weekDates = getWeekDates(weekStart)

  useEffect(() => { loadSwaps(); loadUsers() }, [])

  async function loadUsers() {
    const { data } = await supabase.from('profiles').select('id, name').neq('id', profile.id).order('name')
    setUsers(data || [])
  }

  async function loadSwaps() {
    setLoading(true)
    const { data: sent } = await supabase
      .from('swap_requests')
      .select('*, requester:profiles!swap_requests_requester_id_fkey(name), target:profiles!swap_requests_target_id_fkey(name)')
      .eq('requester_id', profile.id)
      .order('created_at', { ascending: false })
    setMySwaps(sent || [])

    const { data: incoming } = await supabase
      .from('swap_requests')
      .select('*, requester:profiles!swap_requests_requester_id_fkey(name), target:profiles!swap_requests_target_id_fkey(name)')
      .eq('target_id', profile.id)
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
    setIncomingSwaps(incoming || [])
    setLoading(false)
  }

  async function submitSwapRequest() {
    if (!targetUser || !myShiftId || !theirShiftId) {
      toast.error('מלא את כל הפרטים'); return
    }
    setSubmitting(true)
    const res = await fetch('/api/swap/request', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        target_id: targetUser,
        requester_shift: { shift_id: myShiftId, day_index: myDayIndex, week_start: weekISO },
        target_shift: { shift_id: theirShiftId, day_index: theirDayIndex, week_start: weekISO },
        note,
      }),
    })
    const data = await res.json()
    if (data.error) toast.error(data.error)
    else { toast.success('בקשת החלפה נשלחה'); setShowForm(false); loadSwaps() }
    setSubmitting(false)
  }

  async function respondToSwap(id: string, action: 'accept' | 'reject') {
    const res = await fetch('/api/swap/approve', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ swapId: id, action }),
    })
    const data = await res.json()
    if (data.error) toast.error(data.error)
    else { toast.success(action === 'accept' ? 'אישרת - ממתין לאישור מנהל' : 'דחית את הבקשה'); loadSwaps() }
  }

  const statusColor: Record<string, string> = {
    pending: '#f5974f', accepted: '#2dd4a0', rejected: '#f05c5c',
    manager_approved: '#4f7ef8', manager_rejected: '#a07ce8'
  }
  const statusLabel: Record<string, string> = {
    pending: 'ממתין לאישור', accepted: 'אושר - ממתין למנהל', rejected: 'נדחה',
    manager_approved: 'אושר סופית', manager_rejected: 'נדחה ע"י מנהל'
  }

  if (loading) return <div className="text-center py-12" style={{ color: '#7a7f9e' }}>טוען...</div>

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-black text-white">החלפות משמרות</h2>
        <button onClick={() => setShowForm(!showForm)}
          className="px-4 py-2 rounded-lg font-bold text-sm text-white"
          style={{ background: showForm ? '#2e3350' : '#4f7ef8' }}>
          {showForm ? 'ביטול' : 'בקש החלפה'}
        </button>
      </div>

      {/* Request form */}
      {showForm && (
        <div className="rounded-xl p-4 space-y-3" style={{ background: '#1a1d27', border: '1px solid #4f7ef8' }}>
          <h3 className="font-bold text-white">בקשת החלפת משמרת</h3>

          <div>
            <label className="text-xs font-bold mb-1 block" style={{ color: '#7a7f9e' }}>עובד להחלפה</label>
            <select value={targetUser} onChange={e => setTargetUser(e.target.value)}
              className="w-full px-3 py-2 rounded-lg text-sm"
              style={{ background: '#0f1117', border: '1px solid #2e3350', color: '#e8eaf6', outline: 'none' }}>
              <option value="">בחר עובד...</option>
              {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold mb-1 block" style={{ color: '#7a7f9e' }}>המשמרת שלי</label>
              <select value={myDayIndex} onChange={e => setMyDayIndex(+e.target.value)}
                className="w-full px-3 py-2 rounded-lg text-sm mb-2"
                style={{ background: '#0f1117', border: '1px solid #2e3350', color: '#e8eaf6', outline: 'none' }}>
                {DAYS_HE.map((d, i) => <option key={i} value={i}>{d}</option>)}
              </select>
              <select value={myShiftId} onChange={e => setMyShiftId(e.target.value)}
                className="w-full px-3 py-2 rounded-lg text-sm"
                style={{ background: '#0f1117', border: '1px solid #2e3350', color: '#e8eaf6', outline: 'none' }}>
                <option value="">בחר משמרת...</option>
                {getShiftsForDay(myDayIndex).map(s => <option key={s.id} value={s.id}>{s.label} {s.time}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-bold mb-1 block" style={{ color: '#7a7f9e' }}>המשמרת שלהם</label>
              <select value={theirDayIndex} onChange={e => setTheirDayIndex(+e.target.value)}
                className="w-full px-3 py-2 rounded-lg text-sm mb-2"
                style={{ background: '#0f1117', border: '1px solid #2e3350', color: '#e8eaf6', outline: 'none' }}>
                {DAYS_HE.map((d, i) => <option key={i} value={i}>{d}</option>)}
              </select>
              <select value={theirShiftId} onChange={e => setTheirShiftId(e.target.value)}
                className="w-full px-3 py-2 rounded-lg text-sm"
                style={{ background: '#0f1117', border: '1px solid #2e3350', color: '#e8eaf6', outline: 'none' }}>
                <option value="">בחר משמרת...</option>
                {getShiftsForDay(theirDayIndex).map(s => <option key={s.id} value={s.id}>{s.label} {s.time}</option>)}
              </select>
            </div>
          </div>

          <input value={note} onChange={e => setNote(e.target.value)}
            placeholder="הערה (לא חובה)..."
            className="w-full px-3 py-2 rounded-lg text-sm"
            style={{ background: '#0f1117', border: '1px solid #2e3350', color: '#e8eaf6', outline: 'none' }} />

          <button onClick={submitSwapRequest} disabled={submitting}
            className="w-full py-3 rounded-lg font-bold text-white"
            style={{ background: 'linear-gradient(135deg, #4f7ef8, #7c5cbf)', opacity: submitting ? 0.6 : 1 }}>
            {submitting ? 'שולח...' : 'שלח בקשת החלפה'}
          </button>
        </div>
      )}

      {/* Incoming */}
      {incomingSwaps.length > 0 && (
        <div>
          <h3 className="font-bold text-sm mb-3" style={{ color: '#f5974f' }}>
            בקשות שהתקבלו ({incomingSwaps.length})
          </h3>
          <div className="space-y-3">
            {incomingSwaps.map(swap => {
              const rsh = getShiftById(swap.requester_shift?.shift_id)
              const tsh = getShiftById(swap.target_shift?.shift_id)
              return (
                <div key={swap.id} className="rounded-xl p-4" style={{ background: '#1a1d27', border: '1px solid #f5974f' }}>
                  <p className="text-sm text-white mb-1">
                    <span className="font-bold">{swap.requester?.name}</span> מבקש להחליף איתך
                  </p>
                  <p className="text-xs mb-3" style={{ color: '#7a7f9e' }}>
                    הוא נותן: {rsh ? `${rsh.label} ${rsh.time}` : ''} יום {DAYS_HE[swap.requester_shift?.day_index]}
                    {' '}&nbsp;←→&nbsp;{' '}
                    אתה נותן: {tsh ? `${tsh.label} ${tsh.time}` : ''} יום {DAYS_HE[swap.target_shift?.day_index]}
                  </p>
                  {swap.note && <p className="text-xs mb-3" style={{ color: '#7a7f9e' }}>הערה: {swap.note}</p>}
                  <div className="flex gap-2">
                    <button onClick={() => respondToSwap(swap.id, 'accept')}
                      className="flex-1 py-2 rounded-lg font-bold text-sm text-white"
                      style={{ background: '#2dd4a0' }}>אשר</button>
                    <button onClick={() => respondToSwap(swap.id, 'reject')}
                      className="flex-1 py-2 rounded-lg font-bold text-sm"
                      style={{ background: 'transparent', border: '1px solid #f05c5c', color: '#f05c5c' }}>דחה</button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* My swaps */}
      <div>
        <h3 className="font-bold text-sm mb-3" style={{ color: '#7a7f9e' }}>הבקשות שלי</h3>
        {mySwaps.length === 0 ? (
          <div className="text-center py-10 rounded-xl" style={{ background: '#1a1d27', border: '1px solid #2e3350' }}>
            <p className="font-semibold mb-1" style={{ color: '#7a7f9e' }}>אין בקשות החלפה</p>
            <p className="text-xs" style={{ color: '#3d4060' }}>לחץ על "בקש החלפה" כדי לשלוח בקשה לעובד אחר</p>
          </div>
        ) : (
          <div className="space-y-3">
            {mySwaps.map(swap => {
              const rsh = getShiftById(swap.requester_shift?.shift_id)
              const tsh = getShiftById(swap.target_shift?.shift_id)
              return (
                <div key={swap.id} className="rounded-xl p-4"
                  style={{ background: '#1a1d27', border: `1px solid ${statusColor[swap.status] || '#2e3350'}` }}>
                  <div className="flex items-start justify-between mb-1">
                    <p className="text-sm text-white">
                      החלפה עם <span className="font-bold">{swap.target?.name}</span>
                    </p>
                    <span className="text-xs font-bold px-2 py-1 rounded-full"
                      style={{ background: `${statusColor[swap.status]}22`, color: statusColor[swap.status] }}>
                      {statusLabel[swap.status]}
                    </span>
                  </div>
                  <p className="text-xs" style={{ color: '#7a7f9e' }}>
                    {rsh ? `${rsh.label} ${rsh.time}` : ''} יום {DAYS_HE[swap.requester_shift?.day_index]}
                    {' '}←→{' '}
                    {tsh ? `${tsh.label} ${tsh.time}` : ''} יום {DAYS_HE[swap.target_shift?.day_index]}
                  </p>
                  {swap.note && <p className="text-xs mt-1" style={{ color: '#7a7f9e' }}>הערה: {swap.note}</p>}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
