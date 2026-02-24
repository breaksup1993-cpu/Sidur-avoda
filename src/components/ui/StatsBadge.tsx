interface StatsBadgeProps {
  label: string
  value: number
  color: string
  min?: number
}

export default function StatsBadge({ label, value, color, min }: StatsBadgeProps) {
  const ok = min === undefined || value >= min
  return (
    <div className="rounded-xl p-3 text-center"
      style={{ background: ok ? `${color}15` : 'rgba(240,92,92,.1)', border: `1px solid ${ok ? color : '#f05c5c'}` }}>
      <div className="text-2xl font-black" style={{ color: ok ? color : '#f05c5c' }}>{value}</div>
      <div className="text-xs font-bold mt-0.5" style={{ color: ok ? color : '#f05c5c' }}>{label}</div>
      {min !== undefined && (
        <div className="text-xs mt-0.5" style={{ color: ok ? '#7a7f9e' : '#f05c5c' }}>
          מינ׳: {min}
        </div>
      )}
    </div>
  )
}
