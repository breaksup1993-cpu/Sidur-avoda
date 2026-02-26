'use client'
import { useState, useMemo } from 'react'
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  useDroppable,
  useDraggable,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core'
import { CSS } from '@dnd-kit/utilities'
import { User, ShiftSelection, CellKey } from '@/types'
import { SHIFTS, DAYS_HE, getShiftById } from '@/lib/shifts'
import { formatDateHE } from '@/lib/week'
import { useScheduleState, makeCellKey, parseCellKey } from './useScheduleState'

const TYPE_COLOR: Record<string, string> = {
  morning: '#4f7ef8',
  noon: '#2dd4a0',
  evening: '#f5974f',
  night: '#f05c5c',
}

interface ScheduleBuilderProps {
  users: User[]
  weekDates: Date[]
  weekISO: string
  initialAssignments: Record<string, ShiftSelection[]>
}

export default function ScheduleBuilder({
  users,
  weekDates,
  weekISO,
  initialAssignments,
}: ScheduleBuilderProps) {
  const { grid, isDirty, saving, addToCell, removeFromCell, save } = useScheduleState({
    weekISO,
    initialAssignments,
  })
  const [activeUserId, setActiveUserId] = useState<string | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 5 } })
  )

  const activeUser = useMemo(
    () => users.find(u => u.id === activeUserId) || null,
    [users, activeUserId]
  )

  const userMap = useMemo(() => {
    const m: Record<string, User> = {}
    users.forEach(u => { m[u.id] = u })
    return m
  }, [users])

  // Count total assignments per user
  const userCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const userIds of Object.values(grid)) {
      for (const uid of userIds) {
        counts[uid] = (counts[uid] || 0) + 1
      }
    }
    return counts
  }, [grid])

  function handleDragStart(event: DragStartEvent) {
    const id = String(event.active.id)
    // Only set if it's a user drag (not a cell chip)
    if (users.some(u => u.id === id)) {
      setActiveUserId(id)
    }
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveUserId(null)
    const { active, over } = event
    if (!over) return

    const userId = String(active.id)
    const cellKey = String(over.id) as CellKey

    // Validate it's a real cell key (contains dash with number prefix)
    if (!cellKey.match(/^\d+-s\d+$/)) return

    addToCell(cellKey, userId)
  }

  // All shifts grouped for rendering rows
  const allShifts = SHIFTS

  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="flex flex-col md:flex-row gap-4">
        {/* Employee Sidebar */}
        <div className="md:w-48 flex-shrink-0">
          <div className="md:sticky md:top-4">
            <h4 className="text-xs font-bold mb-2" style={{ color: '#7a7f9e' }}>
              עובדים — גרור לתא
            </h4>
            <div className="flex flex-row md:flex-col gap-1.5 overflow-x-auto md:overflow-x-visible pb-2 md:pb-0">
              {users.map(user => (
                <DraggableChip key={user.id} user={user} count={userCounts[user.id] || 0} />
              ))}
            </div>
          </div>
        </div>

        {/* Schedule Grid */}
        <div className="flex-1 overflow-x-auto">
          <div className="rounded-xl" style={{ border: '1px solid #2e3350', background: '#1a1d27', minWidth: '700px' }}>
            <table style={{ borderCollapse: 'collapse', width: '100%', fontSize: '12px' }}>
              <thead>
                <tr style={{ background: '#222638' }}>
                  <th className="p-2 text-right font-bold" style={{ color: '#7a7f9e', borderBottom: '1px solid #2e3350', width: '100px' }}>
                    משמרת
                  </th>
                  {weekDates.map((d, i) => (
                    <th key={i} className="p-2 text-center font-bold" style={{
                      color: i >= 5 ? '#a07ce8' : '#7a7f9e',
                      borderBottom: '1px solid #2e3350',
                      minWidth: '85px',
                    }}>
                      {DAYS_HE[i]}<br />
                      <span style={{ fontWeight: 400, fontSize: '10px' }}>{formatDateHE(d)}</span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {allShifts.map(shift => {
                  const color = TYPE_COLOR[shift.type] || '#7a7f9e'
                  return (
                    <tr key={shift.id} style={{ borderBottom: '1px solid #2e3350' }}>
                      <td className="p-2" style={{ background: '#1a1d27', verticalAlign: 'top' }}>
                        <div className="flex items-center gap-1">
                          <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: color }} />
                          <div>
                            <div className="text-xs font-bold" style={{ color }}>{shift.label}</div>
                            <div style={{ color: '#7a7f9e', fontSize: '9px' }}>{shift.time}</div>
                          </div>
                        </div>
                      </td>
                      {weekDates.map((_, dayIndex) => {
                        const isValid = shift.day_of_week.includes(dayIndex)
                        const cellKey = makeCellKey(dayIndex, shift.id)
                        const assignedIds = grid[cellKey] || []

                        if (!isValid) {
                          return (
                            <td key={dayIndex} className="p-1" style={{
                              background: '#0f1117',
                              borderBottom: '1px solid #2e3350',
                              opacity: 0.15,
                            }} />
                          )
                        }

                        return (
                          <td key={dayIndex} className="p-1" style={{
                            background: '#1a1d27',
                            borderBottom: '1px solid #2e3350',
                            verticalAlign: 'top',
                          }}>
                            <DroppableCell
                              cellKey={cellKey}
                              color={color}
                              assignedIds={assignedIds}
                              userMap={userMap}
                              onRemove={(uid) => removeFromCell(cellKey, uid)}
                            />
                          </td>
                        )
                      })}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Save button */}
      <div className="mt-4 flex gap-3 items-center">
        <button
          onClick={save}
          disabled={saving || !isDirty}
          className="px-6 py-3 rounded-xl font-black text-white transition-opacity"
          style={{
            background: isDirty ? 'linear-gradient(135deg, #4f7ef8, #7c5cbf)' : '#222638',
            opacity: saving || !isDirty ? 0.5 : 1,
            border: isDirty ? 'none' : '1px solid #2e3350',
          }}
        >
          {saving ? 'שומר...' : isDirty ? 'שמור סידור' : 'הסידור שמור'}
        </button>
        {isDirty && (
          <span className="text-xs font-bold" style={{ color: '#f5974f' }}>
            יש שינויים שלא נשמרו
          </span>
        )}
      </div>

      {/* Drag Overlay */}
      <DragOverlay>
        {activeUser ? (
          <div
            className="rounded-lg px-3 py-1.5 text-xs font-bold shadow-lg"
            style={{
              background: '#4f7ef8',
              color: '#fff',
              transform: 'rotate(-2deg)',
              opacity: 0.9,
              pointerEvents: 'none',
              whiteSpace: 'nowrap',
            }}
          >
            {activeUser.name}
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  )
}

// --- Draggable Employee Chip (sidebar) ---

function DraggableChip({ user, count }: { user: User; count: number }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: user.id,
  })

  const style: React.CSSProperties = {
    background: '#222638',
    border: '1px solid #2e3350',
    color: '#e8eaf6',
    opacity: isDragging ? 0.4 : 1,
    cursor: 'grab',
    whiteSpace: 'nowrap',
    ...(transform ? { transform: CSS.Translate.toString(transform) } : {}),
  }

  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      className="rounded-lg px-2.5 py-1.5 text-xs font-bold flex items-center gap-1.5 select-none"
      style={style}
    >
      <span>{user.name}</span>
      {count > 0 && (
        <span className="rounded-full px-1.5 text-xs" style={{
          background: '#4f7ef822',
          color: '#4f7ef8',
          fontSize: '9px',
          fontWeight: 800,
        }}>
          {count}
        </span>
      )}
    </div>
  )
}

// --- Droppable Shift Cell ---

function DroppableCell({
  cellKey,
  color,
  assignedIds,
  userMap,
  onRemove,
}: {
  cellKey: CellKey
  color: string
  assignedIds: string[]
  userMap: Record<string, User>
  onRemove: (userId: string) => void
}) {
  const { setNodeRef, isOver } = useDroppable({ id: cellKey })

  return (
    <div
      ref={setNodeRef}
      className="rounded-lg p-1.5 transition-all"
      style={{
        minHeight: '38px',
        background: isOver ? `${color}18` : assignedIds.length > 0 ? `${color}08` : '#0f1117',
        border: `1px ${assignedIds.length > 0 ? 'solid' : 'dashed'} ${isOver ? color : assignedIds.length > 0 ? `${color}33` : '#2e3350'}`,
        boxShadow: isOver ? `0 0 8px ${color}33` : 'none',
      }}
    >
      {assignedIds.length === 0 && !isOver && (
        <div className="text-center" style={{ color: '#3d4060', fontSize: '9px', lineHeight: '30px' }}>
          +
        </div>
      )}
      {isOver && assignedIds.length === 0 && (
        <div className="text-center" style={{ color, fontSize: '9px', lineHeight: '30px' }}>
          שחרר כאן
        </div>
      )}
      <div className="flex flex-col gap-1">
        {assignedIds.map(uid => {
          const user = userMap[uid]
          if (!user) return null
          return (
            <div
              key={uid}
              className="rounded px-1.5 py-0.5 flex items-center justify-between gap-1"
              style={{
                background: `${color}15`,
                border: `1px solid ${color}33`,
                fontSize: '10px',
                color: '#e8eaf6',
              }}
            >
              <span className="font-bold truncate">{user.name}</span>
              <button
                onClick={(e) => { e.stopPropagation(); onRemove(uid) }}
                className="flex-shrink-0 rounded-full w-3.5 h-3.5 flex items-center justify-center"
                style={{ background: '#f05c5c33', color: '#f05c5c', fontSize: '8px', lineHeight: 1 }}
              >
                x
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}
