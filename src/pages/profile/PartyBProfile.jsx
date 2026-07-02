import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import * as profileApi from '../../api/profile'
import Alert from '../../components/Alert'
import LoadingSpinner from '../../components/LoadingSpinner'
import { getErrorMessage, resolveFileUrl } from '../../utils/format'

const FILE_ACCEPT = '.pdf,.doc,.docx,.jpg,.jpeg,.png,.webp'

const EMPTY_FORM = {
  company_name: '',
  registration_number: '',
  country: 'China',
  address: '',
  phone: '',
  website: '',
  tax_id: '',
  company_reg_number: '',
  company_description: '',
  sectors: [],
  hs_codes: '',
  business_license_issue_date: '',
  business_license_authority: '',
  company_reg_date: '',
}

function profileToForm(profile) {
  if (!profile) return { ...EMPTY_FORM }
  return {
    company_name: profile.company_name || '',
    registration_number: profile.registration_number || '',
    country: profile.country || 'China',
    address: profile.address || '',
    phone: profile.phone || '',
    website: profile.website || '',
    tax_id: profile.tax_id || '',
    company_reg_number: profile.company_reg_number || '',
    company_description: profile.company_description || '',
    sectors: Array.isArray(profile.sectors) ? [...profile.sectors] : [],
    hs_codes: profile.hs_codes || '',
    business_license_issue_date: profile.business_license_issue_date || '',
    business_license_authority: profile.business_license_authority || '',
    company_reg_date: profile.company_reg_date || '',
  }
}

function formToPayload(form) {
  return {
    company_name: form.company_name.trim(),
    registration_number: form.registration_number.trim() || undefined,
    country: form.country.trim() || 'China',
    address: form.address.trim(),
    phone: form.phone.trim(),
    website: form.website.trim() || undefined,
    tax_id: form.tax_id.trim(),
    company_reg_number: form.company_reg_number.trim(),
    company_description: form.company_description.trim(),
    sectors: form.sectors,
    hs_codes: form.hs_codes.trim() || undefined,
    business_license_issue_date: form.business_license_issue_date || undefined,
    business_license_authority: form.business_license_authority.trim() || undefined,
    company_reg_date: form.company_reg_date || undefined,
  }
}

function applyProfileData(data, setForm, setCompletion, setAvailableSectors) {
  setForm(profileToForm(data.profile))
  setCompletion(data.completion || null)
  if (Array.isArray(data.available_sectors)) {
    setAvailableSectors(data.available_sectors)
  }
}

export default function PartyBProfile() {
  const [form, setForm] = useState(EMPTY_FORM)
  const [availableSectors, setAvailableSectors] = useState([])
  const [completion, setCompletion] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(null)
  const [deletingId, setDeletingId] = useState(null)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const [otherForm, setOtherForm] = useState({
    title: '',
    description: '',
    file: null,
  })
  const [otherUploading, setOtherUploading] = useState(false)

  const loadProfile = useCallback(async () => {
    setError('')
    try {
      const data = await profileApi.getPartyBProfile()
      applyProfileData(data, setForm, setCompletion, setAvailableSectors)

      if (!data.available_sectors?.length) {
        try {
          const sectorsData = await profileApi.getProfileSectors()
          if (Array.isArray(sectorsData.sectors)) {
            setAvailableSectors(sectorsData.sectors)
          }
        } catch {
          // sectors endpoint optional fallback
        }
      }
    } catch (err) {
      setError(getErrorMessage(err))
    }
  }, [])

  useEffect(() => {
    async function init() {
      setLoading(true)
      await loadProfile()
      setLoading(false)
    }
    init()
  }, [loadProfile])

  const handleFieldChange = (field) => (e) => {
    setForm((f) => ({ ...f, [field]: e.target.value }))
  }

  const toggleSector = (sector) => {
    setForm((f) => {
      const selected = f.sectors.includes(sector)
      return {
        ...f,
        sectors: selected ? f.sectors.filter((s) => s !== sector) : [...f.sectors, sector],
      }
    })
  }

  const handleSave = async (e) => {
    e.preventDefault()
    setSaving(true)
    setError('')
    setSuccess('')
    try {
      const data = await profileApi.updatePartyBProfile(formToPayload(form))
      applyProfileData(data, setForm, setCompletion, setAvailableSectors)
      setSuccess(data.message || 'Profile updated')
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  const handleMandatoryUpload = async (docType, file) => {
    if (!file) return
    setUploading(docType)
    setError('')
    setSuccess('')
    try {
      const data = await profileApi.uploadPartyBProfileDocument({ file, docType })
      applyProfileData(data, setForm, setCompletion, setAvailableSectors)
      const label =
        docType === 'business_license' ? 'Business License' : 'Registration Certificate'
      setSuccess(`${label} uploaded`)
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setUploading(null)
    }
  }

  const handleOtherUpload = async (e) => {
    e.preventDefault()
    if (!otherForm.title.trim() || !otherForm.file) return
    setOtherUploading(true)
    setError('')
    setSuccess('')
    try {
      const data = await profileApi.uploadPartyBProfileDocument({
        file: otherForm.file,
        docType: 'other',
        title: otherForm.title.trim(),
        description: otherForm.description.trim() || undefined,
      })
      applyProfileData(data, setForm, setCompletion, setAvailableSectors)
      setOtherForm({ title: '', description: '', file: null })
      setSuccess('Document uploaded')
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setOtherUploading(false)
    }
  }

  const handleDeleteOther = async (id) => {
    if (!window.confirm('Delete this document?')) return
    setDeletingId(id)
    setError('')
    setSuccess('')
    try {
      const data = await profileApi.deletePartyBProfileDocument(id)
      applyProfileData(data, setForm, setCompletion, setAvailableSectors)
      setSuccess('Document deleted')
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setDeletingId(null)
    }
  }

  const businessLicenseDoc = completion?.mandatory_documents?.business_license
  const registrationCertDoc = completion?.mandatory_documents?.registration_certificate
  const otherDocs = completion?.other_documents || []
  const completionPct = completion?.completion_pct ?? 0
  const missingFields = completion?.missing_fields || []

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  return (
    <div className="w-full space-y-5">
      <div>
        <h3 className="text-lg font-semibold text-slate-800">Company Profile</h3>
        <p className="text-sm text-slate-500">
          Complete your company profile and upload mandatory certificates.
        </p>
        <p className="mt-1 text-xs text-slate-400">
          Account settings (name, email) are in{' '}
          <Link to="/profile" className="font-medium text-portal-primary hover:underline">
            My Profile
          </Link>
          .
        </p>
      </div>

      <Alert type="error" message={error} onClose={() => setError('')} />
      <Alert type="success" message={success} onClose={() => setSuccess('')} />

      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
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
            <p className="font-medium">Complete the following to reach 100%:</p>
            <ul className="mt-2 list-inside list-disc space-y-1">
              {missingFields.map((field) => (
                <li key={field}>{field}</li>
              ))}
            </ul>
          </div>
        )}
        {completion?.profile_complete && (
          <p className="mt-4 text-sm font-medium text-green-700">Your profile is complete.</p>
        )}
      </section>

      <form onSubmit={handleSave} className="space-y-5">
        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h4 className="mb-4 text-base font-semibold text-slate-800">Company Information</h4>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Field label="Company Name" required>
              <input
                type="text"
                value={form.company_name}
                onChange={handleFieldChange('company_name')}
                required
                className={inputClass}
              />
            </Field>
            <Field label="Business Registration / USCC">
              <input
                type="text"
                value={form.registration_number}
                onChange={handleFieldChange('registration_number')}
                className={inputClass}
              />
            </Field>
            <Field label="Country" required>
              <input
                type="text"
                value={form.country}
                onChange={handleFieldChange('country')}
                required
                className={inputClass}
              />
            </Field>
            <Field label="Address" required className="sm:col-span-2 lg:col-span-3">
              <input
                type="text"
                value={form.address}
                onChange={handleFieldChange('address')}
                required
                className={inputClass}
              />
            </Field>
            <Field label="Phone" required>
              <input
                type="tel"
                value={form.phone}
                onChange={handleFieldChange('phone')}
                required
                className={inputClass}
              />
            </Field>
            <Field label="Website">
              <input
                type="url"
                value={form.website}
                onChange={handleFieldChange('website')}
                placeholder="https://"
                className={inputClass}
              />
            </Field>
            <Field label="Tax Registration Number" required>
              <input
                type="text"
                value={form.tax_id}
                onChange={handleFieldChange('tax_id')}
                required
                className={inputClass}
              />
            </Field>
            <Field label="Company Registration Number" required>
              <input
                type="text"
                value={form.company_reg_number}
                onChange={handleFieldChange('company_reg_number')}
                required
                className={inputClass}
              />
            </Field>
            <Field label="HS CODE(s)" className="sm:col-span-2 lg:col-span-1">
              <input
                type="text"
                value={form.hs_codes}
                onChange={handleFieldChange('hs_codes')}
                placeholder="e.g. 1006.30"
                className={inputClass}
              />
            </Field>
            <Field label="Company Description" required className="sm:col-span-2 lg:col-span-3">
              <textarea
                rows={4}
                value={form.company_description}
                onChange={handleFieldChange('company_description')}
                required
                className={inputClass}
              />
            </Field>
          </div>

          <div className="mt-6">
            <p className="mb-3 text-sm font-medium text-slate-700">
              Sectors <span className="text-red-500">*</span>
            </p>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {availableSectors.map((sector) => (
                <label
                  key={sector}
                  className="flex cursor-pointer items-start gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm hover:bg-slate-50"
                >
                  <input
                    type="checkbox"
                    checked={form.sectors.includes(sector)}
                    onChange={() => toggleSector(sector)}
                    className="mt-0.5 rounded border-slate-300 text-portal-primary focus:ring-portal-primary"
                  />
                  <span className="text-slate-700">{sector}</span>
                </label>
              ))}
            </div>
            {availableSectors.length === 0 && (
              <p className="text-sm text-slate-400">No sectors available.</p>
            )}
          </div>
        </section>

        <section className="space-y-4">
          <h4 className="text-base font-semibold text-slate-800">Mandatory Documents</h4>
          <div className="grid gap-4 lg:grid-cols-2">
            <MandatoryDocCard
              title="Business License"
              doc={businessLicenseDoc}
              uploading={uploading === 'business_license'}
              onFileSelect={(file) => handleMandatoryUpload('business_license', file)}
            >
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Business License Issue Date">
                  <input
                    type="date"
                    value={form.business_license_issue_date}
                    onChange={handleFieldChange('business_license_issue_date')}
                    className={inputClass}
                  />
                </Field>
                <Field label="Issuing Authority">
                  <input
                    type="text"
                    value={form.business_license_authority}
                    onChange={handleFieldChange('business_license_authority')}
                    className={inputClass}
                  />
                </Field>
              </div>
              <p className="mt-2 text-xs text-slate-500">
                Tax Registration Number is saved with company information above.
              </p>
            </MandatoryDocCard>

            <MandatoryDocCard
              title="Company Registration Certificate"
              doc={registrationCertDoc}
              uploading={uploading === 'registration_certificate'}
              onFileSelect={(file) => handleMandatoryUpload('registration_certificate', file)}
            >
              <Field label="Company Registration Date">
                <input
                  type="date"
                  value={form.company_reg_date}
                  onChange={handleFieldChange('company_reg_date')}
                  className={inputClass}
                />
              </Field>
              <p className="mt-2 text-xs text-slate-500">
                Company Registration Number is saved with company information above.
              </p>
            </MandatoryDocCard>
          </div>
        </section>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-lg bg-portal-primary px-5 py-2.5 text-sm font-semibold text-white hover:bg-portal-primary-hover disabled:opacity-50"
          >
            {saving ? 'Saving…' : 'Save Changes'}
          </button>
        </div>
      </form>

      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h4 className="mb-4 text-base font-semibold text-slate-800">Other Documents</h4>

        <form onSubmit={handleOtherUpload} className="space-y-4 border-b border-slate-100 pb-6">
          <Field label="Title" required>
            <input
              type="text"
              value={otherForm.title}
              onChange={(e) => setOtherForm((f) => ({ ...f, title: e.target.value }))}
              required
              placeholder="e.g. Bank Statement"
              className={inputClass}
            />
          </Field>
          <Field label="Description">
            <input
              type="text"
              value={otherForm.description}
              onChange={(e) => setOtherForm((f) => ({ ...f, description: e.target.value }))}
              placeholder="Optional note"
              className={inputClass}
            />
          </Field>
          <Field label="File" required>
            <input
              type="file"
              accept={FILE_ACCEPT}
              onChange={(e) =>
                setOtherForm((f) => ({ ...f, file: e.target.files?.[0] || null }))
              }
              className="block w-full text-sm text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-portal-primary file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:bg-portal-primary-hover"
            />
          </Field>
          <button
            type="submit"
            disabled={otherUploading || !otherForm.title.trim() || !otherForm.file}
            className="rounded-lg bg-portal-primary px-4 py-2 text-sm font-semibold text-white hover:bg-portal-primary-hover disabled:opacity-50"
          >
            {otherUploading ? 'Uploading…' : 'Add Document'}
          </button>
        </form>

        {otherDocs.length > 0 ? (
          <ul className="mt-4 divide-y divide-slate-100">
            {otherDocs.map((doc) => (
              <li key={doc.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                <div className="min-w-0">
                  <p className="font-medium text-slate-800">{doc.title}</p>
                  {doc.description && (
                    <p className="text-sm text-slate-500">{doc.description}</p>
                  )}
                  {doc.original_filename && (
                    <p className="text-xs text-slate-400">{doc.original_filename}</p>
                  )}
                </div>
                <div className="flex shrink-0 items-center gap-2">
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
                  <button
                    type="button"
                    onClick={() => handleDeleteOther(doc.id)}
                    disabled={deletingId === doc.id}
                    className="rounded-lg border border-red-200 px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
                  >
                    {deletingId === doc.id ? 'Deleting…' : 'Delete'}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-4 text-sm text-slate-400">No other documents uploaded yet.</p>
        )}
      </section>
    </div>
  )
}

const inputClass =
  'w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-portal-primary focus:ring-2 focus:ring-portal-primary/30'

function Field({ label, required, className = '', children }) {
  return (
    <div className={className}>
      <label className="mb-1 block text-sm font-medium text-slate-700">
        {label}
        {required && <span className="text-red-500"> *</span>}
      </label>
      {children}
    </div>
  )
}

function MandatoryDocCard({ title, doc, uploading, onFileSelect, children }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h5 className="font-semibold text-slate-800">{title}</h5>
          <span
            className={`mt-1 inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${
              doc ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'
            }`}
          >
            {doc ? 'Uploaded' : 'Required'}
          </span>
        </div>
      </div>

      {children}

      <div className="mt-4">
        {doc ? (
          <div className="mb-3 rounded-lg bg-green-50 px-4 py-3 text-sm">
            <p className="font-medium text-green-900">
              {doc.original_filename || 'Document on file'}
            </p>
            {doc.file_url && (
              <a
                href={resolveFileUrl(doc.file_url)}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-1 inline-block font-medium text-portal-primary hover:underline"
              >
                View document
              </a>
            )}
          </div>
        ) : null}

        <label className="block">
          <span className="mb-1 block text-sm font-medium text-slate-700">
            {doc ? 'Replace file' : 'Upload file'} <span className="text-red-500">*</span>
          </span>
          <input
            type="file"
            accept={FILE_ACCEPT}
            disabled={uploading}
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (file) onFileSelect(file)
              e.target.value = ''
            }}
            className="block w-full text-sm text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-portal-primary file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:bg-portal-primary-hover disabled:opacity-50"
          />
        </label>
        {uploading && <p className="mt-2 text-sm text-slate-500">Uploading…</p>}
        <p className="mt-2 text-xs text-slate-400">PDF, DOC, DOCX, JPG, PNG, WEBP — max 10 MB</p>
      </div>
    </div>
  )
}
