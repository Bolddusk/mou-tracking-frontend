import {
  getConferenceDisplayTitle,
  findConferenceByKey,
  getMouConferenceRow,
  MOU_OPERATIONAL_STATUS_OPTIONS,
  shouldShowConferenceMouDetails,
} from '../../utils/mouConferenceFields'
import DetailField from './DetailField'

function StatusSelectField({ label, value, options, onChange, disabled }) {
  const resolvedValue =
    !value || value === '—' ? options[0] || '' : value

  return (
    <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-4">
      <label className="block">
        <span className="text-[10px] font-bold uppercase tracking-wide text-slate-500">{label}</span>
        <select
          value={resolvedValue}
          onChange={(e) => onChange?.(e.target.value)}
          disabled={disabled}
          className="mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-sm text-slate-800 outline-none focus:border-portal-primary focus:ring-2 focus:ring-portal-primary/30 disabled:opacity-60"
        >
          {options.map((status) => (
            <option key={status} value={status}>
              {status}
            </option>
          ))}
        </select>
      </label>
    </div>
  )
}

export default function MouConferenceDetailsSection({
  proposal,
  conferences = [],
  onEdit,
  canEditStatus = false,
  onStatusChange,
  statusSaving = false,
}) {
  if (!shouldShowConferenceMouDetails(proposal, conferences)) return null

  const row = getMouConferenceRow(proposal)
  const conferenceName =
    proposal?.conference_name ||
    getConferenceDisplayTitle(findConferenceByKey(conferences, proposal?.conference_key)) ||
    null

  return (
    <section className="rounded-xl border border-green-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold text-slate-900">MOU Details</h3>
          <p className="mt-1 text-xs text-slate-500">
            {conferenceName
              ? `Conference record — ${conferenceName}`
              : 'Imported conference MOU fields — value, status, progress, and timelines.'}
          </p>
        </div>
        {onEdit && (
          <button
            type="button"
            onClick={onEdit}
            className="shrink-0 rounded-lg border border-green-700/30 bg-green-50 px-3 py-1.5 text-xs font-semibold text-green-900 hover:bg-green-100"
          >
            Edit fields
          </button>
        )}
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        <DetailField label="Chinese Company" value={row.chineseCompany} />
        <DetailField label="Pakistani Company" value={row.pakistaniCompany} />
        <DetailField label="SIFC Category" value={row.sifcCategory} />
        <DetailField label="Sector" value={row.sector} />
        <DetailField label="Cooperation Mode" value={row.cooperationMode} />
        <DetailField label="MoU Value" value={row.mouValue} />
        {canEditStatus ? (
          <StatusSelectField
            label="Status"
            value={row.operationalStatus}
            options={MOU_OPERATIONAL_STATUS_OPTIONS}
            onChange={onStatusChange}
            disabled={statusSaving}
          />
        ) : (
          <DetailField label="Status" value={row.operationalStatus} />
        )}
        <DetailField label="Outcome / Description" value={row.outcome} multiline />
        <DetailField label="Progress" value={row.progress} multiline />
        <DetailField label="Bottleneck" value={row.bottlenecks} multiline />
        <DetailField label="Tentative Timelines" value={row.tentativeTimeline} multiline />
        <DetailField label="Location" value={row.location} />
      </div>
    </section>
  )
}
