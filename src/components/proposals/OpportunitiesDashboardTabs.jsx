export default function OpportunitiesDashboardTabs({ active, onChange }) {
  const tabs = [
    { id: 'opportunities', label: 'Opportunities' },
    { id: 'change-logs', label: 'Change Logs' },
  ]

  return (
    <div className="flex gap-1 border-b border-slate-200 px-4 pt-2">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          onClick={() => onChange(tab.id)}
          className={`rounded-t-lg px-4 py-2.5 text-sm font-semibold transition ${
            active === tab.id
              ? 'border border-b-white border-slate-200 bg-white text-portal-primary'
              : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'
          }`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  )
}
