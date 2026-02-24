'use client'
import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { ShiftSelection, WeekRequest, User } from '@/types'
import { validateRequest, countByCategory } from '@/lib/validation'
import { getWeekStart, getWeekDates, weekStartToISO, getWeekTitle, offsetWeek } from '@/lib/week'
import ShiftPicker from '@/components/shifts/ShiftPicker'
import ValidationPanel from '@/components/ui/ValidationPanel'
import StatsBadge from '@/components/ui/StatsBadge'
import SwapsTab from '@/components/shifts/SwapsTab'
import toast from 'react-hot-toast'

interface Props { profile: User }
type Tab = 'request' | 'history' | 'swaps'

// Auto deadline: every Tuesday at 12:00
function getAutoDeadline(weekStart: Date): string {
  const d = new Date(weekStart)
  d.setDate(d.getDate() + 2) // Tuesday (week starts Sunday)
  d.setHours(12, 0, 0, 0)
  return d.toISOString()
}

export default function EmployeeDashboard({ profile }: Props) {
  const [tab, setTab] = useState<Tab>('request')
  const [weekOffset, setWeekOffset] = useState(0)
  const [selections, setSelections] = useState<ShiftSelection[]>([])
  const [existingRequest, setExistingRequest] = useState<WeekRequest | null>(null)
  const [history, setHistory] = useState<WeekRequest[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  const weekStart = offsetWeek(getWeekStart(), weekOffset)
  const weekDates = getWeekDates(weekStart)
  const weekISO = weekStartToISO(weekStart)
  const deadline = getAutoDeadline(weekStart)
  const validation = validateRequest(selections)
  const counts = countByCategory(selections)
  const isPastDeadline = new Date() > new Date(deadline)

  const loadWeekData = useCallback(async () => {
    setLoading(true)
    const { data: req } = await supabase
      .from('week_requests')
      .select('*')
      .eq('user_id', profile.id)
      .eq('week_start', weekISO)
      .single()

    if (req) {
      setExistingRequest(req)
      setSelections(req.selections || [])
    } else {
      setExistingRequest(null)
      setSelections([])
    }
    setLoading(false)
  }, [weekISO, profile.id])

  useEffect(() => { loadWeekData() }, [loadWeekData])
  useEffect(() => { if (tab === 'history') loadHistory() }, [tab])

  async function loadHistory() {
    const { data } = await supabase
      .from('week_requests')
      .select('*')
      .eq('user_id', profile.id)
      .order('week_start', { ascending: false })
      .limit(10)
    setHistory(data || [])
  }

  async function handleSubmit() {
    if (!validation.valid) { toast.error('תקן שגיאות לפני שליחה'); return }
    if (isPastDeadline) { toast.error('עבר הדדליין להגשה'); return }
    setSubmitting(true)

    const payload = {
      user_id: profile.id,
      week_start: weekISO,
      selections,
      status: 'pending' as const,
      submitted_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    if (existingRequest && existingRequest.status === 'pending') {
      const { error } = await supabase
        .from('week_requests')
        .update({ selections, updated_at: new Date().toISOString() })
        .eq('id', existingRequest.id)
      if (error) toast.error('שגיאה בשמירה'); else toast.success('בקשה עודכנה')
    } else if (!existingRequest) {
      const { error } = await supabase.from('week_requests').insert(payload)
      if (error) toast.error('שגיאה בשליחה'); else toast.success('בקשה נשלחה למנהל')
    }

    await loadWeekData()
    setSubmitting(false)
  }

  const canEdit = !existingRequest || existingRequest.status === 'pending'
  const statusColor: Record<string, string> = { pending: '#f5974f', approved: '#2dd4a0', rejected: '#f05c5c' }
  const statusLabel: Record<string, string> = { pending: 'ממתין לאישור', approved: 'אושר', rejected: 'נדחה' }

  const TABS: [Tab, string][] = [['request', 'הגשת בקשה'], ['history', 'היסטוריה'], ['swaps', 'החלפות']]

  return (
    <div>
      <div className="flex gap-2 mb-6">
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

      {tab === 'request' && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-black text-white">שבוע {getWeekTitle(weekStart)}</h2>
              <div className="text-xs mt-0.5" style={{ color: isPastDeadline ? '#f05c5c' : '#7a7f9e' }}>
                {isPastDeadline ? 'עבר הדדליין' : `דדליין: ${new Date(deadline).toLocaleString('he-IL')}`}
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setWeekOffset(o => o + 1)} className="w-8 h-8 rounded-lg flex items-center justify-center font-bold"
                style={{ background: '#222638', border: '1px solid #2e3350', color: '#e8eaf6' }}>›</button>
              <button onClick={() => setWeekOffset(0)} className="px-3 h-8 rounded-lg text-xs font-bold"
                style={{ background: '#222638', border: '1px solid #2e3350', color: '#7a7f9e' }}>היום</button>
              <button onClick={() => setWeekOffset(o => o - 1)} className="w-8 h-8 rounded-lg flex items-center justify-center font-bold"
                style={{ background: '#222638', border: '1px solid #2e3350', color: '#e8eaf6' }}>‹</button>
            </div>
          </div>

          {existingRequest && (
            <div className="rounded-xl p-3 mb-4 flex items-center justify-between"
              style={{
                background: `rgba(${existingRequest.status === 'approved' ? '45,212,160' : existingRequest.status === 'rejected' ? '240,92,92' : '245,151,79'}, .1)`,
                border: `1px solid ${statusColor[existingRequest.status]}`,
              }}>
              <span className="font-bold text-sm" style={{ color: statusColor[existingRequest.status] }}>
                {statusLabel[existingRequest.status]}
              </span>
              {existingRequest.manager_note && (
                <span className="text-xs" style={{ color: '#7a7f9e' }}>
                  הערת מנהל: {existingRequest.manager_note}
                </span>
              )}
            </div>
          )}

          <div className="grid grid-cols-4 gap-2 mb-4">
            <StatsBadge label="בקרים" value={counts.morning} color="#4f7ef8" min={2} />
            <StatsBadge label="צהריים" value={counts.noon} color="#2dd4a0" min={1} />
            <StatsBadge label="ערב" value={counts.evening} color="#f5974f" />
            <StatsBadge label="לילות" value={counts.night} color="#f05c5c" />
          </div>

          {selections.length > 0 && <ValidationPanel result={validation} />}

          {loading ? (
            <div className="text-center py-12" style={{ color: '#7a7f9e' }}>טוען...</div>
          ) : (
            <div className="rounded-xl p-4 mb-4" style={{ background: '#1a1d27', border: '1px solid #2e3350' }}>
              <ShiftPicker
                weekDates={weekDates}
                selections={selections}
                onChange={setSelections}
                disabled={!canEdit || isPastDeadline}
              />
            </div>
          )}

          {canEdit && !isPastDeadline && (
            <button
              onClick={handleSubmit}
              disabled={submitting || !validation.valid}
              className="w-full py-4 rounded-xl font-black text-lg text-white transition-opacity"
              style={{
                background: validation.valid ? 'linear-gradient(135deg, #4f7ef8, #7c5cbf)' : '#222638',
                opacity: submitting || !validation.valid ? 0.5 : 1,
                border: validation.valid ? 'none' : '1px solid #2e3350',
              }}>
              {submitting ? 'שולח...' : existingRequest ? 'עדכן בקשה' : 'שלח בקשה למנהל'}
            </button>
          )}
        </div>
      )}

      {tab === 'history' && (
        <div className="space-y-3">
          <h2 className="text-lg font-black text-white mb-4">היסטוריית בקשות</h2>
          {history.length === 0 ? (
            <div className="text-center py-12" style={{ color: '#7a7f9e' }}>אין היסטוריה</div>
          ) : history.map(req => (
            <div key={req.id} className="rounded-xl p-4"
              style={{ background: '#1a1d27', border: `1px solid ${statusColor[req.status] || '#2e3350'}` }}>
              <div className="flex items-center justify-between mb-2">
                <span className="font-bold text-sm text-white">
                  שבוע {new Date(req.week_start).toLocaleDateString('he-IL')}
                </span>
                <span className="text-xs font-bold px-3 py-1 rounded-full"
                  style={{
                    background: `rgba(${req.status === 'approved' ? '45,212,160' : req.status === 'rejected' ? '240,92,92' : '245,151,79'},.15)`,
                    color: statusColor[req.status],
                  }}>
                  {statusLabel[req.status]}
                </span>
              </div>
              <div className="text-xs" style={{ color: '#7a7f9e' }}>
                {(req.selections || []).length} משמרות נרשמו
                {req.manager_note && <span className="mr-3">הערה: {req.manager_note}</span>}
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === 'swaps' && <SwapsTab profile={profile} />}
    </div>
  )
}
