import { format, startOfWeek, addDays, addWeeks } from 'date-fns'
import { he } from 'date-fns/locale'

// Week starts on Sunday (Israel standard)
export function getWeekStart(date: Date = new Date()): Date {
  return startOfWeek(date, { weekStartsOn: 0 })
}

export function getWeekDates(weekStart: Date): Date[] {
  return Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))
}

export function weekStartToISO(weekStart: Date): string {
  return format(weekStart, 'yyyy-MM-dd')
}

export function formatDateHE(date: Date): string {
  return format(date, 'd.M', { locale: he })
}

export function formatDateFullHE(date: Date): string {
  return format(date, 'EEEE d בMMMM', { locale: he })
}

export function getWeekTitle(weekStart: Date): string {
  const end = addDays(weekStart, 6)
  return `${formatDateHE(weekStart)} – ${formatDateHE(end)}`
}

export function offsetWeek(weekStart: Date, offset: number): Date {
  return addWeeks(weekStart, offset)
}

export function parseWeekStart(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d)
}
