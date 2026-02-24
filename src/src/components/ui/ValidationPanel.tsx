import { ValidationResult } from '@/types'

export default function ValidationPanel({ result }: { result: ValidationResult }) {
  if (result.valid && result.warnings.length === 0) return null
  return (
    <div className="rounded-xl p-4 mb-4 space-y-2"
      style={{ background: result.valid ? 'rgba(245,200,66,.06)' : 'rgba(240,92,92,.06)', border: `1px solid ${result.valid ? '#f5c84244' : '#f05c5c'}` }}>
      {result.errors.map((e, i) => (
        <div key={i} className="flex gap-2 text-sm" style={{ color: '#f05c5c' }}>
          <span>!</span><span>{e}</span>
        </div>
      ))}
      {result.warnings.map((w, i) => (
        <div key={i} className="flex gap-2 text-sm" style={{ color: '#f5c842' }}>
          <span>*</span><span>{w}</span>
        </div>
      ))}
    </div>
  )
}
