interface StatsBadgeProps {
  label: string
  value: number
  color?: string
  min?: number
}

export default function StatsBadge({ label, value, color = '#7a7f9e', min }: StatsBadgeProps) {
  const isLow = min !== undefined && value < min
  const displayColor = isLow ? '#f05c5c' : value > 0 ? color : '#7a7f9e'

  return (
    <div className="rounded-xl px-4 py-3 flex flex-col"
      style={{ background: '#222638', border: `1px solid ${isLow ? '#f05c5c' : '#2e3350'}` }}>
      <span className="text-2xl font-black" style={{ color: displayColor }}>{value}</span>
      <span className="text-xs font-semibold mt-0.5" style={{ color: '#7a7f9e' }}>{label}</span>
    </div>
  )
}
