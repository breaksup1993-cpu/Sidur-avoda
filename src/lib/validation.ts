import { ShiftSelection, ValidationResult } from '@/types'
import { getShiftById } from './shifts'

export function validateRequest(selections: ShiftSelection[]): ValidationResult {
  const errors: string[] = []
  const warnings: string[] = []

  const morningShifts = selections.filter(s => {
    const sh = getShiftById(s.shift_id)
    return sh && sh.type === 'morning' && sh.category === 'regular'
  })
  const noonShifts = selections.filter(s => {
    const sh = getShiftById(s.shift_id)
    return sh && sh.type === 'noon' && sh.category === 'regular'
  })
  const nightShifts = selections.filter(s => {
    const sh = getShiftById(s.shift_id)
    return sh && (sh.type === 'night') && sh.category === 'regular'
  })

  const isMinimum = morningShifts.length <= 2 && noonShifts.length <= 1

  if (morningShifts.length < 2) {
    errors.push(`חובה לרשום לפחות 2 בקרים (רשמת ${morningShifts.length})`)
  }
  if (noonShifts.length < 1) {
    errors.push(`חובה לרשום לפחות צהריים 1 (רשמת ${noonShifts.length})`)
  }
  if (isMinimum && nightShifts.length > 0) {
    errors.push('מי שרושם מינימום בלבד (2 בקרים + 1 צהריים) אינו יכול לרשום לילות')
  }

  // Rule: no morning + evening same day
  const days = new Set(selections.map(s => s.day_index))
  days.forEach(day => {
    const daySelections = selections.filter(s => s.day_index === day)
    const hasMorning = daySelections.some(s => {
      const sh = getShiftById(s.shift_id)
      return sh?.type === 'morning'
    })
    const hasEvening = daySelections.some(s => {
      const sh = getShiftById(s.shift_id)
      return sh?.type === 'evening'
    })
    if (hasMorning && hasEvening) {
      const dayNames = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת']
      errors.push(`לא ניתן לרשום גם בוקר וגם ערב ביום ${dayNames[day]}`)
    }
  })

  // Duplicate check
  const seen = new Set<string>()
  for (const sel of selections) {
    const key = `${sel.day_index}-${sel.shift_id}`
    if (seen.has(key)) {
      warnings.push('בחרת את אותה משמרת פעמיים באותו יום')
    }
    seen.add(key)
  }

  return { valid: errors.length === 0, errors, warnings }
}

export function countByCategory(selections: ShiftSelection[]) {
  const morning = selections.filter(s => {
    const sh = getShiftById(s.shift_id)
    return sh && sh.type === 'morning' && sh.category === 'regular'
  }).length
  const noon = selections.filter(s => {
    const sh = getShiftById(s.shift_id)
    return sh && sh.type === 'noon' && sh.category === 'regular'
  }).length
  const evening = selections.filter(s => {
    const sh = getShiftById(s.shift_id)
    return sh && sh.type === 'evening' && sh.category === 'regular'
  }).length
  const night = selections.filter(s => {
    const sh = getShiftById(s.shift_id)
    return sh && sh.type === 'night' && sh.category === 'regular'
  }).length
  const managerOnly = selections.filter(s => {
    const sh = getShiftById(s.shift_id)
    return sh && sh.category === 'manager_only'
  }).length
  return { morning, noon, evening, night, managerOnly }
}
