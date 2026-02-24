export type Role = 'manager' | 'shift_manager' | 'employee'
export type ShiftType = 'morning' | 'noon' | 'evening' | 'night'
export type ShiftCategory = 'regular' | 'manager_only'
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
  category: ShiftCategory
  day_of_week: number[]
  employee_selectable: boolean
}

export interface ShiftSelection {
  shift_id: string
  day_index: number
  note?: string
}

export interface WeekRequest {
  id: string
  user_id: string
  user_name?: string
  week_start: string
  selections: ShiftSelection[]
  status: RequestStatus
  manager_note?: string
  submitted_at: string
  updated_at: string
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
  note?: string
  created_at: string
  updated_at: string
}

export interface ValidationResult {
  valid: boolean
  errors: string[]
  warnings: string[]
}
