import { Link } from 'react-router-dom'
import { resolveFileUrl } from '../../utils/format'
import DetailField from './DetailField'

const PARTY_A_MANDATORY = [
  { key: 'fbr_certificate', label: 'FBR Taxpayer Registration Certificate' },
  { key: 'secp_certificate', label: 'SECP Certificate of Incorporation' },
]

const PARTY_B_MANDATORY = [
  { key: 'business_license', label: 'Business License' },
  { key: 'registration_certificate', label: 'Company Registration Certificate' },
]

function CompletionBadge({ completion }) {
  if (!completion) return null
  if (completion.profile_complete) {
    return (
      <span className="rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-semibold text-green-800 ring-1 ring-green-200">
        Complete ✓
      </span>
    )
  }
  const pct = completion.completion_pct ?? 0
  return (
    <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-900 ring-1 ring-amber-200">
      {pct}% complete
    </span>
  )
}

function DocFieldContent({ doc }) {
  if (!doc?.file_url) {
    return <p className="mt-1.5 text-sm text-slate-400">Not uploaded</p>
  }
  return (
    <a
      href={resolveFileUrl(doc.file_url)}
      target="_blank"
      rel="noopener noreferrer"
      className="mt-1.5 inline-block text-sm font-medium text-portal-primary hover:underline"
    >
      {doc.original_filename || 'View document'}
    </a>
  )
}

export default function PartyProfileSnapshotCard({
  title,
  snapshot,
  contactItems = [],
  fallbackContacts,
  mandatoryDocTypes = PARTY_A_MANDATORY,
  profileViewPath,
  editContactsAction,
  embedded = false,
}) {
  const data = snapshot?.data
  const completion = data?.completion
  const documents = data?.documents || []
  const resolvedContacts =
    contactItems.length > 0
      ? contactItems
      : Array.isArray(fallbackContacts)
        ? fallbackContacts
        : []

  const getMandatoryDoc = (docType) => {
    const fromCompletion = completion?.mandatory_documents?.[docType]
    const fromList = documents.find((d) => d.doc_type === docType)
    if (!fromCompletion && !fromList) return null
    return {
      ...fromList,
      ...fromCompletion,
      file_url: fromCompletion?.file_url || fromList?.file_url,
      original_filename: fromCompletion?.original_filename || fromList?.original_filename,
    }
  }

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
        {data && <CompletionBadge completion={completion} />}
      </div>

      {snapshot?.reason && !data && (
        <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
          {snapshot.reason}
        </div>
      )}

      {resolvedContacts.length > 0 ? (
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {resolvedContacts.map(({ label, value }) => (
            <DetailField
              key={label}
              label={label}
              value={value}
              multiline={String(value || '').length > 48}
            />
          ))}
        </div>
      ) : (
        <p className="mt-4 text-sm text-slate-400">No contact details on proposal.</p>
      )}

      {data && (
        <>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            {mandatoryDocTypes.map(({ key, label }) => {
              const doc = getMandatoryDoc(key)
              return (
                <DetailField key={key} label={label}>
                  <DocFieldContent doc={doc} />
                </DetailField>
              )
            })}
          </div>

          {completion?.missing_fields?.length > 0 && !completion.profile_complete && (
            <div className="mt-4 rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-xs text-blue-800">
              <p className="font-semibold uppercase tracking-wide">Profile incomplete</p>
              <ul className="mt-2 list-inside list-disc space-y-0.5">
                {completion.missing_fields.slice(0, 4).map((f) => (
                  <li key={f}>{f}</li>
                ))}
                {completion.missing_fields.length > 4 && (
                  <li>+{completion.missing_fields.length - 4} more</li>
                )}
              </ul>
            </div>
          )}

          {data.read_only && data.can_edit !== true && (
            <p className="mt-3 text-[10px] text-slate-400">Read-only snapshot from linked account</p>
          )}
        </>
      )}

      {snapshot?.linked && !data && (
        <p className="mt-4 text-sm text-slate-500">Account linked — profile not yet completed.</p>
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

export { PARTY_A_MANDATORY, PARTY_B_MANDATORY }
