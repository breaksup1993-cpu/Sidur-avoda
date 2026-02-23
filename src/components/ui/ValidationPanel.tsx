import { ValidationResult } from '@/types'

export default function ValidationPanel({ result }: { result: ValidationResult }) {
  if (result.errors.length === 0 && result.warnings.length === 0) {
    return (
      <div className="rounded-xl p-3 mb-4 flex items-center gap-2"
        style={{ background: 'rgba(45,212,160,.08)', border: '1px solid #2dd4a0' }}>
        <span>✅</span>
        <span className="text-sm font-semibold" style={{ color: '#2dd4a0' }}>הבקשה תקינה</span>
      </div>
    )
  }

  return (
    <div className="rounded-xl p-4 mb-4 space-y-1"
      style={{
        background: result.errors.length > 0 ? 'rgba(240,92,92,.08)' : 'rgba(245,151,79,.08)',
        border: `1px solid ${result.errors.length > 0 ? '#f05c5c' : '#f5974f'}`,
      }}>
      <div className="font-bold text-sm mb-2" style={{ color: result.errors.length > 0 ? '#f05c5c' : '#f5974f' }}>
        {result.errors.length > 0 ? '⚠ שגיאות בבקשה' : '⚠ אזהרות'}
      </div>
      {result.errors.map((e, i) => (
        <div key={i} className="flex items-start gap-2 text-sm">
          <span>❌</span><span style={{ color: '#f05c5c' }}>{e}</span>
        </div>
      ))}
      {result.warnings.map((w, i) => (
        <div key={i} className="flex items-start gap-2 text-sm">
          <span>⚠️</span><span style={{ color: '#f5974f' }}>{w}</span>
        </div>
      ))}
    </div>
  )
}
