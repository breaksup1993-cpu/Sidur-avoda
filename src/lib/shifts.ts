import { Shift } from '@/types'

export const SHIFTS: Shift[] = [
  // ימים א-ה בוקר
  { id: 's1', label: 'בוקר מוקדם', time: '06:30–14:30', type: 'morning', category: 'regular', day_of_week: [0,1,2,3,4] },
  { id: 's2', label: 'בוקר', time: '07:45–16:00', type: 'morning', category: 'regular', day_of_week: [0,1,2,3,4] },
  { id: 's3', label: 'בוקר 8:30', time: '08:30–15:00', type: 'morning', category: 'regular', day_of_week: [0,1,2,3,4] },
  // ימים א-ה צהריים/אחה"צ
  { id: 's4', label: 'צהריים', time: '12:00–20:00', type: 'noon', category: 'regular', day_of_week: [0,1,2,3,4] },
  { id: 's5', label: 'אחה"צ', time: '14:30–23:00', type: 'noon', category: 'regular', day_of_week: [0,1,2,3,4] },
  // ימים א-ה לילה
  { id: 's6', label: 'לילה', time: '23:00–07:00', type: 'night', category: 'regular', day_of_week: [0,1,2,3,4] },
  // שישי בוקר - סבב (לא איכות)
  { id: 's7', label: 'שישי בוקר', time: '07:00–15:00', type: 'morning', category: 'rotation', day_of_week: [5] },
  // שישי לילה - איכות
  { id: 's8', label: 'שישי לילה ⭐', time: '23:00–07:00', type: 'night', category: 'premium', day_of_week: [5] },
  // שבת לילה - איכות
  { id: 's9', label: 'שבת לילה ⭐', time: '23:00–07:00', type: 'night', category: 'premium', day_of_week: [6] },
]

export const DAYS_HE = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת']
export const DAYS_SHORT = ['א\'', 'ב\'', 'ג\'', 'ד\'', 'ה\'', 'ו\'', 'ש\'']

export function getShiftsForDay(dayOfWeek: number): Shift[] {
  return SHIFTS.filter(s => s.day_of_week.includes(dayOfWeek))
}

export function getShiftById(id: string): Shift | undefined {
  return SHIFTS.find(s => s.id === id)
}
