'use client'
import { useState } from 'react'
import { ShiftSelection } from '@/types'
import { SHIFTS, DAYS_HE, getShiftsForDay } from '@/lib/shifts'
import { formatDateHE } from '@/lib/week'

interface ShiftPickerProps {
  weekDates: Date[]
  selections: ShiftSelection[]
  onChange: (selections: ShiftSelection[]) => void
  disabled?: boolean
}

const CATEGORY_COLORS = {
  regular: { border: '#2e3350', selectedBg: 'rgba(79,126,248,.12)', selectedBorder: '#4f7ef8', selectedText: '#4f7ef8' },
  rotation: { border: '#7c5cbf', selectedBg: 'rgba(124,92,191,.15)', selectedBorder: '#7c5cbf', selectedText: '#a07ce8' },
  premium: { border: '#f5c842', selectedBg: 'rgba(245,200,66,.12)', selectedBorder: '#f5c842', selectedText: '#f5c842' },
}

const TYPE_DOT: Record<string, string> = {
  morning: '#4f7ef8',
  noon: '#2dd4a0',
  night: '#f05c5c',
}

export default function ShiftPicker({ weekDates, selections, onChange, disabled }: ShiftPickerProps) {
  const [openNote, setOpenNote] = useState<string | null>(null)

  function isSelected(dayIndex: number, shiftId: string) {
    return selections.some(s => s.day_index === dayIndex && s.shift_id === shiftId)
  }

  function getNote(dayIndex: number, shiftId: string) {
    return selections.find(s => s.day_index === dayIndex && s.shift_id === shiftId)?.note || ''
  }

  function toggle(dayIndex: number, shiftId: string) {
    if (disabled) return
    const exists = isSelected(dayIndex, shiftId)
    if (exists) {
      onChange(selections.filter(s => !(s.day_index === dayIndex && s.shift_id === shiftId)))
      setOpenNote(null)
    } else {
      onChange([...selections, { day_index: dayIndex, shift_id: shiftId, note: '' }])
    }
  }

  function setNote(dayIndex: number, shiftId: string, note: string) {
    onChange(selections.map(s =>
      s.day_index === dayIndex && s.shift_id === shiftId ? { ...s, note } : s
    ))
  }

  return (
    <div className="overflow-x-auto">
      <div style={{ display: 'grid', gridTemplateColumns: `repeat(7, minmax(110px, 1fr))`, gap: '8px', minWidth: '770px' }}>
        {weekDates.map((date, dayIndex) => {
          const shifts = getShiftsForDay(dayIndex)
          const isWeekend = dayIndex >= 5
          return (
            <div key={dayIndex} className="rounded-xl p-2"
              style={{ background: '#1a1d27', border: `1px solid ${isWeekend ? '#3d3060' : '#2e3350'}` }}>
              <div className="text-center mb-2">
                <div className="text-xs font-black" style={{ color: isWeekend ? '#a07ce8' : '#7a7f9e' }}>
                  {DAYS_HE[dayIndex]}
                </div>
                <div className="text-xs" style={{ color: '#7a7f9e' }}>{formatDateHE(date)}</div>
              </div>

              {shifts.length === 0 ? (
                <div className="text-center text-xs py-4" style={{ color: '#3d4060' }}>—</div>
              ) : (
                shifts.map(shift => {
                  const sel = isSelected(dayIndex, shift.id)
                  const note = getNote(dayIndex, shift.id)
                  const noteKey = `${dayIndex}-${shift.id}`
                  const colors = CATEGORY_COLORS[shift.category]

                  return (
                    <div key={shift.id} className="mb-1.5">
                      <div
                        onClick={() => toggle(dayIndex, shift.id)}
                        className="rounded-lg p-2 cursor-pointer transition-all select-none"
                        style={{
                          background: sel ? colors.selectedBg : '#0f1117',
                          border: `1px solid ${sel ? colors.selectedBorder : colors.border}`,
                          opacity: disabled ? 0.5 : 1,
                          cursor: disabled ? 'not-allowed' : 'pointer',
                        }}
                      >
                        <div className="flex items-center gap-1 mb-0.5">
                          <div className="w-2 h-2 rounded-full flex-shrink-0"
                            style={{ background: TYPE_DOT[shift.type] }} />
                          <span className="text-xs font-bold leading-tight"
                            style={{ color: sel ? colors.selectedText : '#e8eaf6', fontSize: '10px' }}>
                            {shift.label}
                          </span>
                        </div>
                        <div className="text-xs" style={{ color: '#7a7f9e', fontSize: '9px' }}>
                          {shift.time}
                        </div>
                      </div>

                      {/* Note input */}
                      {sel && (
                        <div className="mt-1">
                          {openNote === noteKey ? (
                            <input
                              type="text"
                              value={note}
                              placeholder="הערה..."
                              onChange={e => setNote(dayIndex, shift.id, e.target.value)}
                              onBlur={() => setOpenNote(null)}
                              autoFocus
                              className="w-full px-2 py-1 rounded text-xs"
                              style={{
                                background: '#0f1117',
                                border: '1px solid #4f7ef8',
                                color: '#e8eaf6',
                                outline: 'none',
                                fontSize: '10px',
                              }}
                            />
                          ) : (
                            <button
                              onClick={e => { e.stopPropagation(); setOpenNote(noteKey) }}
                              className="w-full text-right px-2 py-1 rounded text-xs transition-colors"
                              style={{
                                background: 'transparent',
                                border: '1px dashed #2e3350',
                                color: note ? '#f5974f' : '#3d4060',
                                fontSize: '10px',
                              }}
                            >
                              {note || '📝 הוסף הערה'}
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  )
                })
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
