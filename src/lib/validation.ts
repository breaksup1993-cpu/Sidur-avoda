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
    return sh && sh.type === 'night' && sh.category === 'regular'
  })
  const premiumShifts = selections.filter(s => {
    const sh = getShiftById(s.shift_id)
    return sh && sh.category === 'premium'
  })
  const rotationShifts = selections.filter(s => {
    const sh = getShiftById(s.shift_id)
    return sh && sh.category === 'rotation'
  })

  const isMinimum = morningShifts.length <= 2 && noonShifts.length <= 1

  // Rule 1: minimum 2 mornings
  if (morningShifts.length < 2) {
    errors.push(`חובה לרשום לפחות 2 בקרים (רשמת ${morningShifts.length})`)
  }

  // Rule 2: minimum 1 noon
  if (noonShifts.length < 1) {
    errors.push(`חובה לרשום לפחות צהריים 1 (רשמת ${noonShifts.length})`)
  }

  // Rule 3: minimum only → no nights
  if (isMinimum && nightShifts.length > 0) {
    errors.push('מי שרושם מינימום בלבד (2 בקרים + 1 צהריים) אינו יכול לרשום לילות')
  }

  // Rule 4: minimum only → no premium (שישי/שבת לילה)
  if (isMinimum && premiumShifts.length > 0) {
    errors.push('מי שרושם מינימום בלבד אינו יכול להשתבץ במשמרות איכות (שישי/שבת לילה)')
  }

  // Rule 5: minimum only → no rotation (שישי בוקר)
  if (isMinimum && rotationShifts.length > 0) {
    errors.push('מי שרושם מינימום בלבד אינו יכול להשתבץ בשישי בוקר (משמרת סבב)')
  }

  // Duplicate day+type check
  const seen = new Set<string>()
  for (const sel of selections) {
    const key = `${sel.day_index}-${sel.shift_id}`
    if (seen.has(key)) {
      warnings.push(`בחרת את אותה משמרת פעמיים באותו יום`)
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
  const night = selections.filter(s => {
    const sh = getShiftById(s.shift_id)
    return sh && sh.type === 'night' && sh.category === 'regular'
  }).length
  const rotation = selections.filter(s => {
    const sh = getShiftById(s.shift_id)
    return sh && sh.category === 'rotation'
  }).length
  const premium = selections.filter(s => {
    const sh = getShiftById(s.shift_id)
    return sh && sh.category === 'premium'
  }).length
  return { morning, noon, night, rotation, premium }
}
