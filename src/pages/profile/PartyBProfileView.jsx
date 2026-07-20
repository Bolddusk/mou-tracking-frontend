import { useCallback, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import * as profileApi from '../../api/profile'
import Alert from '../../components/Alert'
import LoadingSpinner from '../../components/LoadingSpinner'
import { getPartyBProfilePaths, getProfileAccessError } from '../../constants/profileRoutes'
import { useAuth } from '../../context/AuthContext'
import { formatDate, getErrorMessage, resolveFileUrl } from '../../utils/format'
import { documentFileUrl, getProfileDocument } from '../../utils/profileDocuments'
import PartyBProfile from './PartyBProfile'

function ViewDocButton({ url, label = 'View Document' }) {
  if (!url) {
    return <span className="text-sm text-slate-400">Not uploaded</span>
  }
  const href = resolveFileUrl(url)
  return (
    <div className="flex flex-wrap gap-2">
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center rounded-lg bg-portal-primary px-4 py-2 text-sm font-semibold text-white hover:bg-portal-primary-hover"
      >
        {label}
      </a>
      <a
        href={href}
        download
        className="inline-flex items-center rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
      >
        Download
      </a>
    </div>
  )
}

function InfoRow({ label, value }) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</dt>
      <dd className="mt-0.5 text-sm text-slate-800">{value || '—'}</dd>
    </div>
  )
}

export default function PartyBProfileView() {
  const { userId } = useParams()
  const { user } = useAuth()
  const paths = getPartyBProfilePaths(user?.role)

  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const res = await profileApi.getPartyBProfileByUserId(userId)
      setData(res)
    } catch (err) {
      setError(getProfileAccessError(err) || getErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }, [userId])

  useEffect(() => {
    load()
  }, [load])

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="mx-auto max-w-2xl space-y-4">
        <Link
          to={paths.list}
          className="text-sm font-medium text-portal-primary hover:underline"
        >
          ← Back to {paths.listLabel}
        </Link>
        <Alert type="error" message={error} />
      </div>
    )
  }

  const canEdit = data?.can_edit === true
  const account = data?.user || {}

  if (canEdit) {
    return (
      <div className="mx-auto max-w-4xl space-y-6">
        <div>
          <Link
            to={paths.list}
            className="text-sm font-medium text-portal-primary hover:underline"
          >
            ← Back to {paths.listLabel}
          </Link>
          <div className="mt-3">
            <h3 className="text-lg font-semibold text-slate-800">Party B Profile</h3>
            <p className="mt-1 text-sm text-slate-600">
              {account.full_name || '—'}
              {account.email ? ` · ${account.email}` : ''}
            </p>
          </div>
        </div>
        <PartyBProfile staffUserId={userId} />
      </div>
    )
  }

  const profile = data?.profile || {}
  const completion = data?.completion || {}
  const documents = data?.documents || []
  const completionPct = completion.completion_pct ?? 0
  const missingFields = completion.missing_fields || []
  const businessLicenseDoc = getProfileDocument('business_license', { completion, documents })
  const registrationCertDoc = getProfileDocument('registration_certificate', {
    completion,
    documents,
  })
  const otherDocs = completion.other_documents?.length
    ? completion.other_documents
    : documents.filter((d) => d.doc_type === 'other')
  const sectors = Array.isArray(profile.sectors) ? profile.sectors : []
  const readOnly = data?.read_only !== false

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <Link
          to={paths.list}
          className="text-sm font-medium text-portal-primary hover:underline"
        >
          ← Back to {paths.listLabel}
        </Link>
        <div className="mt-3 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="text-lg font-semibold text-slate-800">
              Party B Profile
              {readOnly && (
                <span className="ml-2 rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600">
                  Read Only
                </span>
              )}
            </h3>
            <p className="mt-1 text-sm text-slate-600">
              {account.full_name || '—'}
              {account.email ? ` · ${account.email}` : ''}
            </p>
            {profile.company_name && (
              <p className="text-sm text-slate-500">{profile.company_name}</p>
            )}
          </div>
          {completion.profile_complete && (
            <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-800">
              Profile Complete ✓
            </span>
          )}
        </div>
      </div>

      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-3 flex items-center justify-between">
          <h4 className="text-base font-semibold text-slate-800">Profile Completion</h4>
          <span className="text-sm font-semibold text-portal-primary">{completionPct}%</span>
        </div>
        <div className="h-3 overflow-hidden rounded-full bg-slate-100">
          <div
            className="h-full rounded-full bg-portal-primary transition-all duration-500"
            style={{ width: `${Math.min(100, Math.max(0, completionPct))}%` }}
          />
        </div>
        {missingFields.length > 0 && (
          <div className="mt-4 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800">
            <p className="font-medium">Missing items:</p>
            <ul className="mt-2 list-inside list-disc space-y-1">
              {missingFields.map((field) => (
                <li key={field}>{field}</li>
              ))}
            </ul>
          </div>
        )}
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h4 className="mb-4 text-base font-semibold text-slate-800">Company Information</h4>
        <dl className="grid gap-4 sm:grid-cols-2">
          <InfoRow label="Company Name" value={profile.company_name} />
          <InfoRow label="Business Registration / USCC" value={profile.registration_number} />
          <InfoRow label="Country" value={profile.country} />
          <InfoRow label="Address" value={profile.address} />
          <InfoRow label="Phone" value={profile.phone} />
          <InfoRow label="Website" value={profile.website} />
          <InfoRow label="Tax Registration Number" value={profile.tax_id} />
          <InfoRow label="Company Registration Number" value={profile.company_reg_number} />
          <InfoRow label="HS CODE(s)" value={profile.hs_codes} />
          <InfoRow
            label="Business License Issue Date"
            value={formatDate(profile.business_license_issue_date)}
          />
          <InfoRow label="Issuing Authority" value={profile.business_license_authority} />
          <InfoRow
            label="Company Registration Date"
            value={formatDate(profile.company_reg_date)}
          />
          <div className="sm:col-span-2">
            <InfoRow label="Company Description" value={profile.company_description} />
          </div>
        </dl>

        {sectors.length > 0 && (
          <div className="mt-6">
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">
              Sectors
            </p>
            <div className="flex flex-wrap gap-2">
              {sectors.map((sector) => (
                <span
                  key={sector}
                  className="rounded-full bg-green-100 px-3 py-1 text-xs font-medium text-green-800 ring-1 ring-green-200"
                >
                  {sector}
                </span>
              ))}
            </div>
          </div>
        )}

        <p className="mt-6 text-xs text-slate-400">
          Last updated {formatDate(profile.updated_at)}
        </p>
      </section>

      <section className="space-y-4">
        <h4 className="text-base font-semibold text-slate-800">Mandatory Documents</h4>

        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h5 className="font-semibold text-slate-800">Business License</h5>
          {businessLicenseDoc?.original_filename && (
            <p className="mt-1 text-sm text-slate-600">{businessLicenseDoc.original_filename}</p>
          )}
          <div className="mt-3">
            <ViewDocButton url={documentFileUrl(businessLicenseDoc)} />
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h5 className="font-semibold text-slate-800">Company Registration Certificate</h5>
          {registrationCertDoc?.original_filename && (
            <p className="mt-1 text-sm text-slate-600">{registrationCertDoc.original_filename}</p>
          )}
          <div className="mt-3">
            <ViewDocButton url={documentFileUrl(registrationCertDoc)} />
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h4 className="mb-4 text-base font-semibold text-slate-800">Other Documents</h4>
        {otherDocs.length > 0 ? (
          <ul className="divide-y divide-slate-100">
            {otherDocs.map((doc) => (
              <li key={doc.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                <div>
                  <p className="font-medium text-slate-800">{doc.title}</p>
                  {doc.description && (
                    <p className="text-sm text-slate-500">{doc.description}</p>
                  )}
                  {doc.original_filename && (
                    <p className="text-xs text-slate-400">{doc.original_filename}</p>
                  )}
                </div>
                {doc.file_url && (
                  <a
                    href={resolveFileUrl(doc.file_url)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm font-medium text-portal-primary hover:underline"
                  >
                    View document
                  </a>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-slate-400">No other documents uploaded.</p>
        )}
      </section>
    </div>
  )
}
