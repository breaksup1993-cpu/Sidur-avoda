import { Shift } from '@/types'

export const SHIFTS: Shift[] = [
  // ימים א-ה בוקר
  { id: 's1', label: 'בוקר מוקדם', time: '06:30-14:30', type: 'morning', category: 'regular', day_of_week: [0,1,2,3,4], employee_selectable: true },
  { id: 's2', label: 'בוקר', time: '07:45-16:00', type: 'morning', category: 'regular', day_of_week: [0,1,2,3,4], employee_selectable: true },
  { id: 's3', label: 'בוקר', time: '08:30-15:00', type: 'morning', category: 'regular', day_of_week: [0,1,2,3,4], employee_selectable: true },
  // ימים א-ה צהריים
  { id: 's4', label: 'צהריים', time: '12:00-20:00', type: 'noon', category: 'regular', day_of_week: [0,1,2,3,4], employee_selectable: true },
  // ימים א-ה ערב
  { id: 's5', label: 'ערב', time: '14:30-23:00', type: 'evening', category: 'regular', day_of_week: [0,1,2,3,4], employee_selectable: true },
  // ימים א-ה לילה
  { id: 's6', label: 'לילה', time: '23:00-07:00', type: 'night', category: 'regular', day_of_week: [0,1,2,3,4], employee_selectable: true },
  // שישי - רק מנהל מסדר
  { id: 's7', label: 'שישי בוקר', time: '07:00-15:00', type: 'morning', category: 'manager_only', day_of_week: [5], employee_selectable: false },
  { id: 's8', label: 'שישי ערב', time: '15:00-23:00', type: 'evening', category: 'manager_only', day_of_week: [5], employee_selectable: false },
  { id: 's9', label: 'שישי לילה', time: '23:00-07:00', type: 'night', category: 'manager_only', day_of_week: [5], employee_selectable: false },
  // שבת - רק מנהל מסדר
  { id: 's10', label: 'שבת בוקר', time: '07:00-15:00', type: 'morning', category: 'manager_only', day_of_week: [6], employee_selectable: false },
  { id: 's11', label: 'שבת ערב', time: '15:00-23:00', type: 'evening', category: 'manager_only', day_of_week: [6], employee_selectable: false },
  { id: 's12', label: 'שבת לילה', time: '18:00-23:00', type: 'evening', category: 'manager_only', day_of_week: [6], employee_selectable: false },
  { id: 's13', label: 'שבת לילה', time: '23:00-07:00', type: 'night', category: 'manager_only', day_of_week: [6], employee_selectable: false },
]

export const DAYS_HE = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת']
export const DAYS_SHORT = ["א'", "ב'", "ג'", "ד'", "ה'", "ו'", "ש'"]

export function getShiftsForDay(dayOfWeek: number, managerView = false): Shift[] {
  return SHIFTS.filter(s => {
    if (!s.day_of_week.includes(dayOfWeek)) return false
    if (!managerView && !s.employee_selectable) return false
    return true
  })
}

export function getShiftById(id: string): Shift | undefined {
  return SHIFTS.find(s => s.id === id)
}

// Check if employee has morning shift on a given day
export function hasMorningOnDay(selections: import('@/types').ShiftSelection[], dayIndex: number): boolean {
  return selections.some(s => {
    if (s.day_index !== dayIndex) return false
    const sh = getShiftById(s.shift_id)
    return sh?.type === 'morning'
  })
}

// Check if employee has evening shift on a given day
export function hasEveningOnDay(selections: import('@/types').ShiftSelection[], dayIndex: number): boolean {
  return selections.some(s => {
    if (s.day_index !== dayIndex) return false
    const sh = getShiftById(s.shift_id)
    return sh?.type === 'evening'
  })
}
