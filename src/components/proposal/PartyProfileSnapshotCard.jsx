import { Link } from 'react-router-dom'
import { resolveFileUrl } from '../../utils/format'
import { documentFileUrl, getProfileDocument } from '../../utils/profileDocuments'
import DetailField from './DetailField'

const PARTY_A_MANDATORY = [
  { key: 'fbr_certificate', label: 'FBR Taxpayer Registration Certificate' },
  { key: 'secp_certificate', label: 'SECP Certificate of Incorporation' },
]

const PARTY_B_MANDATORY = [
  { key: 'business_license', label: 'Business License' },
  { key: 'registration_certificate', label: 'Company Registration Certificate' },
]

const PROFILE_BANNER =
  'Fields will populate after email is set and the company profile is completed.'

function displayValue(value) {
  if (value == null) return '—'
  const text = String(value).trim()
  return text && text !== '—' ? text : '—'
}

function CompletionBadge({ pct = 0, complete = false }) {
  if (complete) {
    return (
      <span className="rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-semibold text-green-800 ring-1 ring-green-200">
        Complete ✓
      </span>
    )
  }
  return (
    <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-900 ring-1 ring-amber-200">
      {pct}% complete
    </span>
  )
}

function DocFieldContent({ doc }) {
  const url = documentFileUrl(doc)
  if (!url) {
    return <p className="mt-1.5 text-sm text-slate-400">Not uploaded</p>
  }
  const href = resolveFileUrl(url)
  return (
    <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1">
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="text-sm font-medium text-portal-primary hover:underline"
      >
        {doc.original_filename || 'View document'}
      </a>
      <a
        href={href}
        download={doc.original_filename || true}
        className="text-sm font-medium text-slate-600 hover:underline"
      >
        Download
      </a>
    </div>
  )
}

export default function PartyProfileSnapshotCard({
  title,
  snapshot,
  fields,
  mandatoryDocTypes = PARTY_A_MANDATORY,
  profileViewPath,
  editContactsAction,
  showBanner = false,
  embedded = false,
}) {
  const data = snapshot?.data
  const completion = data?.completion
  const documents = data?.documents || []
  const pct = completion?.completion_pct ?? 0
  const complete = completion?.profile_complete === true

  const getMandatoryDoc = (docType) =>
    getProfileDocument(docType, { completion, documents })

  const shellClass = embedded
    ? 'flex h-full flex-col'
    : 'flex h-full flex-col rounded-xl border border-green-200 bg-white p-5 shadow-sm'

  return (
    <section className={shellClass}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold text-slate-900">{title}</h3>
          <p className="mt-1 text-xs text-slate-500">
            Proposal contacts and mandatory profile documents
          </p>
        </div>
        <CompletionBadge pct={pct} complete={complete} />
      </div>

      {showBanner && (
        <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
          {PROFILE_BANNER}
        </div>
      )}

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <DetailField label="Company" value={displayValue(fields?.company)} />
        <DetailField label="Contact Person" value={displayValue(fields?.contactPerson)} />
        <DetailField label="Email" value={displayValue(fields?.email)} />
        <DetailField label="Country" value={displayValue(fields?.country)} />
      </div>

      <div className="mt-5">
        <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
          Documents
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          {mandatoryDocTypes.map(({ key, label }) => {
            const doc = getMandatoryDoc(key)
            return (
              <DetailField key={key} label={label}>
                <DocFieldContent doc={doc} />
              </DetailField>
            )
          })}
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-100 bg-slate-50 px-3 py-2">
        <p className="text-xs font-medium text-slate-600">Completion</p>
        <p className="text-sm font-semibold text-slate-800">{complete ? '100%' : `${pct}%`}</p>
      </div>

      {data?.read_only && data?.can_edit !== true && (
        <p className="mt-3 text-[10px] text-slate-400">Read-only snapshot from linked account</p>
      )}

      <div className="mt-auto flex flex-wrap gap-2 pt-5">
        {profileViewPath && (
          <Link
            to={profileViewPath}
            className="rounded-lg border border-green-700/30 bg-green-50 px-3 py-1.5 text-xs font-semibold text-green-900 hover:bg-green-100"
          >
            View full profile
          </Link>
        )}
        {editContactsAction}
      </div>
    </section>
  )
}

export { PARTY_A_MANDATORY, PARTY_B_MANDATORY, PROFILE_BANNER }
