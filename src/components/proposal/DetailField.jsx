export default function DetailField({ label, value, multiline = false, children }) {
  return (
    <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-4">
      <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">{label}</p>
      {children ?? (
        <p
          className={`mt-1.5 text-sm text-slate-800 ${multiline ? 'whitespace-pre-wrap' : 'break-words'}`}
        >
          {value || '—'}
        </p>
      )}
    </div>
  )
}
