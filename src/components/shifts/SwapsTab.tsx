'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { User } from '@/types'
import { getShiftById, DAYS_HE } from '@/lib/shifts'
import toast from 'react-hot-toast'

interface Props { profile: User }

export default function SwapsTab({ profile }: Props) {
  const [mySwaps, setMySwaps] = useState<any[]>([])
  const [incomingSwaps, setIncomingSwaps] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => { loadSwaps() }, [])

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

  async function respondToSwap(id: string, accept: boolean) {
    const { error } = await supabase
      .from('swap_requests')
      .update({ status: accept ? 'accepted' : 'rejected', updated_at: new Date().toISOString() })
      .eq('id', id)
    if (error) toast.error('שגיאה')
    else { toast.success(accept ? 'אישרת את ההחלפה - ממתין לאישור מנהל' : 'דחית את בקשת ההחלפה'); loadSwaps() }
  }

  const statusColor: Record<string, string> = {
    pending: '#f5974f', accepted: '#2dd4a0', rejected: '#f05c5c',
    manager_approved: '#4f7ef8', manager_rejected: '#a07ce8'
  }
  const statusLabel: Record<string, string> = {
    pending: 'ממתין', accepted: 'אושר - ממתין למנהל', rejected: 'נדחה',
    manager_approved: 'אושר סופית', manager_rejected: 'נדחה ע"י מנהל'
  }

  function swapDesc(swap: any, isMine: boolean) {
    const rs = swap.requester_shift
    const ts = swap.target_shift
    const rsh = rs ? getShiftById(rs.shift_id) : null
    const tsh = ts ? getShiftById(ts.shift_id) : null
    if (isMine) {
      return `ביקשת להחליף ${rsh ? `${rsh.label} ${rsh.time}` : ''} יום ${DAYS_HE[rs?.day_index]} עם ${swap.target?.name} (${tsh ? `${tsh.label} ${tsh.time}` : ''} יום ${DAYS_HE[ts?.day_index]})`
    }
    return `${swap.requester?.name} מבקש להחליף ${rsh ? `${rsh.label} ${rsh.time}` : ''} יום ${DAYS_HE[rs?.day_index]} עם המשמרת שלך (${tsh ? `${tsh.label} ${tsh.time}` : ''} יום ${DAYS_HE[ts?.day_index]})`
  }

  if (loading) return <div className="text-center py-12" style={{ color: '#7a7f9e' }}>טוען...</div>

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-black text-white">החלפות משמרות</h2>

      {/* Incoming swap requests */}
      {incomingSwaps.length > 0 && (
        <div>
          <h3 className="font-bold text-sm mb-3" style={{ color: '#f5974f' }}>בקשות שהתקבלו ({incomingSwaps.length})</h3>
          <div className="space-y-3">
            {incomingSwaps.map(swap => (
              <div key={swap.id} className="rounded-xl p-4" style={{ background: '#1a1d27', border: '1px solid #f5974f' }}>
                <p className="text-sm text-white mb-3">{swapDesc(swap, false)}</p>
                {swap.note && <p className="text-xs mb-3" style={{ color: '#7a7f9e' }}>הערה: {swap.note}</p>}
                <div className="flex gap-2">
                  <button onClick={() => respondToSwap(swap.id, true)}
                    className="flex-1 py-2 rounded-lg font-bold text-sm text-white"
                    style={{ background: '#2dd4a0' }}>אשר החלפה</button>
                  <button onClick={() => respondToSwap(swap.id, false)}
                    className="flex-1 py-2 rounded-lg font-bold text-sm"
                    style={{ background: 'transparent', border: '1px solid #f05c5c', color: '#f05c5c' }}>דחה</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* My sent swaps */}
      <div>
        <h3 className="font-bold text-sm mb-3" style={{ color: '#7a7f9e' }}>הבקשות שלי</h3>
        {mySwaps.length === 0 ? (
          <div className="text-center py-12 rounded-xl" style={{ background: '#1a1d27', border: '1px solid #2e3350', color: '#7a7f9e' }}>
            <p className="font-semibold">אין בקשות החלפה</p>
            <p className="text-xs mt-1">לבקשת החלפה, פנה למנהל</p>
          </div>
        ) : (
          <div className="space-y-3">
            {mySwaps.map(swap => (
              <div key={swap.id} className="rounded-xl p-4" style={{ background: '#1a1d27', border: `1px solid ${statusColor[swap.status] || '#2e3350'}` }}>
                <div className="flex items-start justify-between mb-2">
                  <p className="text-sm text-white flex-1">{swapDesc(swap, true)}</p>
                  <span className="text-xs font-bold px-2 py-1 rounded-full mr-2 flex-shrink-0"
                    style={{ background: `${statusColor[swap.status]}22`, color: statusColor[swap.status] }}>
                    {statusLabel[swap.status]}
                  </span>
                </div>
                {swap.note && <p className="text-xs" style={{ color: '#7a7f9e' }}>הערה: {swap.note}</p>}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
