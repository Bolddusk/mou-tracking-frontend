import {
  getConferenceDisplayTitle,
  findConferenceByKey,
  getMouConferenceRow,
  shouldShowConferenceMouDetails,
} from '../../utils/mouConferenceFields'
import OperationalStatusBadge from '../proposals/OperationalStatusBadge'

function DetailField({ label, value, multiline = false, badge = false }) {
  return (
    <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-4">
      <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">{label}</p>
      {badge ? (
        <div className="mt-2">
          <OperationalStatusBadge status={value} />
        </div>
      ) : (
        <p
          className={`mt-1.5 text-sm text-slate-800 ${multiline ? 'whitespace-pre-wrap' : ''}`}
        >
          {value}
        </p>
      )}
    </div>
  )
}

export default function MouConferenceDetailsSection({ proposal, conferences = [] }) {
  if (!shouldShowConferenceMouDetails(proposal, conferences)) return null

  const row = getMouConferenceRow(proposal)
  const conferenceName =
    proposal?.conference_name ||
    getConferenceDisplayTitle(findConferenceByKey(conferences, proposal?.conference_key)) ||
    null

  return (
    <section className="rounded-xl border border-green-200 bg-white p-5 shadow-sm">
      <h3 className="text-base font-semibold text-slate-900">MOU Details</h3>
      <p className="mt-1 text-xs text-slate-500">
        {conferenceName
          ? `Conference record — ${conferenceName}`
          : 'Imported conference MOU fields — value, status, progress, and timelines.'}
      </p>
      <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        <DetailField label="Chinese Company" value={row.chineseCompany} />
        <DetailField label="Pakistani Company" value={row.pakistaniCompany} />
        <DetailField label="SIFC Category" value={row.sifcCategory} />
        <DetailField label="Agriculture Sub-Sector" value={row.agricultureSubSector} />
        <DetailField label="Cooperation Mode" value={row.cooperationMode} />
        <DetailField label="MoU Value" value={row.mouValue} />
        <DetailField label="Outcome / Description" value={row.outcome} multiline />
        <DetailField label="Status" value={row.operationalStatus} badge />
        <DetailField label="Progress" value={row.progress} multiline />
        <DetailField label="Bottleneck" value={row.bottlenecks} multiline />
        <DetailField label="Tentative Timelines" value={row.tentativeTimeline} multiline />
      </div>
    </section>
  )
}
