'use client'
import { useState, useCallback, useRef, useEffect } from 'react'
import { ShiftSelection, CellKey } from '@/types'
import { createClient } from '@/lib/supabase/client'
import toast from 'react-hot-toast'

export function makeCellKey(dayIndex: number, shiftId: string): CellKey {
  return `${dayIndex}-${shiftId}` as CellKey
}

export function parseCellKey(key: CellKey): [number, string] {
  const dash = key.indexOf('-')
  return [Number(key.slice(0, dash)), key.slice(dash + 1)]
}

// Convert from DB format (per-user) to grid format (per-cell)
function assignmentsToGrid(assignments: Record<string, ShiftSelection[]>): Record<CellKey, string[]> {
  const grid: Record<CellKey, string[]> = {}
  for (const [userId, selections] of Object.entries(assignments)) {
    for (const sel of selections) {
      const key = makeCellKey(sel.day_index, sel.shift_id)
      if (!grid[key]) grid[key] = []
      if (!grid[key].includes(userId)) {
        grid[key].push(userId)
      }
    }
  }
  return grid
}

// Convert from grid format (per-cell) to DB format (per-user)
function gridToAssignments(grid: Record<CellKey, string[]>): Record<string, ShiftSelection[]> {
  const assignments: Record<string, ShiftSelection[]> = {}
  for (const [key, userIds] of Object.entries(grid)) {
    const [dayIndex, shiftId] = parseCellKey(key as CellKey)
    for (const userId of userIds) {
      if (!assignments[userId]) assignments[userId] = []
      assignments[userId].push({ day_index: dayIndex, shift_id: shiftId })
    }
  }
  return assignments
}

interface UseScheduleStateProps {
  weekISO: string
  initialAssignments: Record<string, ShiftSelection[]>
}

export function useScheduleState({ weekISO, initialAssignments }: UseScheduleStateProps) {
  const [grid, setGrid] = useState<Record<CellKey, string[]>>(() =>
    assignmentsToGrid(initialAssignments)
  )
  const [isDirty, setIsDirty] = useState(false)
  const [saving, setSaving] = useState(false)
  const supabase = createClient()
  const savedRef = useRef<Record<string, ShiftSelection[]>>(initialAssignments)

  // Re-initialize when week changes or external data reloads
  useEffect(() => {
    setGrid(assignmentsToGrid(initialAssignments))
    savedRef.current = initialAssignments
    setIsDirty(false)
  }, [weekISO, initialAssignments])

  const addToCell = useCallback((cellKey: CellKey, userId: string) => {
    setGrid(prev => {
      const current = prev[cellKey] || []
      if (current.includes(userId)) return prev
      return { ...prev, [cellKey]: [...current, userId] }
    })
    setIsDirty(true)
  }, [])

  const removeFromCell = useCallback((cellKey: CellKey, userId: string) => {
    setGrid(prev => {
      const current = prev[cellKey] || []
      const filtered = current.filter(id => id !== userId)
      const next = { ...prev }
      if (filtered.length === 0) {
        delete next[cellKey]
      } else {
        next[cellKey] = filtered
      }
      return next
    })
    setIsDirty(true)
  }, [])

  const save = useCallback(async () => {
    setSaving(true)
    try {
      const perUser = gridToAssignments(grid)

      // Find all users who have or had assignments
      const allUserIds = Array.from(new Set([
        ...Object.keys(perUser),
        ...Object.keys(savedRef.current),
      ]))

      for (const userId of allUserIds) {
        const selections = perUser[userId] || []
        await supabase.from('manual_assignments').upsert({
          week_start: weekISO,
          user_id: userId,
          selections,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'week_start,user_id' })
      }

      savedRef.current = perUser
      setIsDirty(false)
      toast.success('סידור נשמר')
    } catch {
      toast.error('שגיאה בשמירה')
    }
    setSaving(false)
  }, [grid, weekISO, supabase])

  return { grid, isDirty, saving, addToCell, removeFromCell, save }
}
