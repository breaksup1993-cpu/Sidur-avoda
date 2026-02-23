export type Role = 'manager' | 'employee'
export type ShiftType = 'morning' | 'noon' | 'night'
export type ShiftCategory = 'regular' | 'rotation' | 'premium'
export type RequestStatus = 'pending' | 'approved' | 'rejected'
export type SwapStatus = 'pending' | 'accepted' | 'rejected' | 'manager_approved' | 'manager_rejected'

export interface User {
  id: string
  email: string
  name: string
  role: Role
  created_at: string
  must_change_password: boolean
}

export interface Shift {
  id: string
  label: string
  time: string
  type: ShiftType
  category: ShiftCategory // regular | rotation (שישי בוקר) | premium (שישי/שבת לילה)
  day_of_week: number[] // 0=Sun .. 6=Sat
}

export interface ShiftSelection {
  shift_id: string
  day_index: number // 0-6 within the week
  note?: string
}

export interface WeekRequest {
  id: string
  user_id: string
  user_name?: string
  week_start: string // ISO date of Sunday
  selections: ShiftSelection[]
  status: RequestStatus
  manager_note?: string
  submitted_at: string
  updated_at: string
}

export interface WeekDeadline {
  id: string
  week_start: string
  deadline: string // ISO datetime
  created_by: string
}

export interface SwapRequest {
  id: string
  requester_id: string
  requester_name?: string
  target_id: string
  target_name?: string
  requester_shift: ShiftSelection & { week_start: string }
  target_shift: ShiftSelection & { week_start: string }
  status: SwapStatus
  created_at: string
  updated_at: string
}

export interface ValidationResult {
  valid: boolean
  errors: string[]
  warnings: string[]
}

export interface Stats {
  user_id: string
  user_name: string
  period_start: string
  period_end: string
  morning_count: number
  noon_count: number
  night_count: number
  rotation_count: number // שישי בוקר
  premium_count: number // שישי/שבת לילה
  total_shifts: number
}
