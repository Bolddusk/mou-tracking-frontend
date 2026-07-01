import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import * as adminSlApi from '../../api/adminSectorLead'
import * as usersApi from '../../api/users'
import Alert from '../../components/Alert'
import LoadingSpinner from '../../components/LoadingSpinner'
import { useSectors } from '../../context/SectorsContext'
import { getErrorMessage } from '../../utils/format'

export default function SectorLeadReassign() {
  const { sectors } = useSectors()
  const [sector, setSector] = useState('')
  const [sectorLeads, setSectorLeads] = useState([])
  const [loadingLeads, setLoadingLeads] = useState(false)
  const [newSlUserId, setNewSlUserId] = useState('')
  const [reason, setReason] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const loadSectorLeads = useCallback(async (selectedSector) => {
    if (!selectedSector) {
      setSectorLeads([])
      setNewSlUserId('')
      return
    }
    setLoadingLeads(true)
    try {
      const leads = await usersApi.getSectorLeads(selectedSector)
      setSectorLeads(Array.isArray(leads) ? leads : [])
      setNewSlUserId('')
    } catch {
      setSectorLeads([])
    } finally {
      setLoadingLeads(false)
    }
  }, [])

  useEffect(() => {
    loadSectorLeads(sector)
  }, [sector, loadSectorLeads])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!sector || !newSlUserId) return
    setSubmitting(true)
    setError('')
    setSuccess('')
    try {
      const res = await adminSlApi.reassignSectorLead({
        sector,
        new_sl_user_id: Number(newSlUserId),
        reason,
      })
      setSuccess(
        `${res.message || 'Sector Lead reassigned'} — ${res.complaints_updated ?? 0} complaint(s), ${res.china_proposals_updated ?? 0} China proposal(s) updated for ${res.sector}.`,
      )
      setReason('')
      setNewSlUserId('')
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold text-slate-800">Transfer to New Officer</h3>
          <p className="mt-1 text-sm text-slate-500">
            When a sector officer leaves or changes, move their open complaints and China proposals
            to the new officer for that sector.
          </p>
        </div>
        <Link
          to="/dashboard/super-admin/sector-lead/handoff"
          className="text-sm font-medium text-portal-primary hover:underline"
        >
          Unassigned cases &amp; history →
        </Link>
      </div>

      <Alert type="error" message={error} onClose={() => setError('')} />
      <Alert type="success" message={success} onClose={() => setSuccess('')} />

      <form
        onSubmit={handleSubmit}
        className="space-y-5 rounded-xl border border-slate-200 bg-white p-6 shadow-sm"
      >
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">
            Sector <span className="text-red-500">*</span>
          </label>
          <select
            value={sector}
            onChange={(e) => setSector(e.target.value)}
            required
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-portal-primary focus:ring-2 focus:ring-portal-primary/30"
          >
            <option value="">Select sector…</option>
            {sectors.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">
            New Sector Lead <span className="text-red-500">*</span>
          </label>
          {loadingLeads ? (
            <div className="flex items-center gap-2 py-2 text-sm text-slate-500">
              <LoadingSpinner size="sm" />
              Loading sector leads…
            </div>
          ) : (
            <select
              value={newSlUserId}
              onChange={(e) => setNewSlUserId(e.target.value)}
              required
              disabled={!sector}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-portal-primary focus:ring-2 focus:ring-portal-primary/30 disabled:bg-slate-50"
            >
              <option value="">
                {sector
                  ? sectorLeads.length
                    ? 'Select new Sector Lead…'
                    : 'No Sector Lead for this sector — create one in Users'
                  : 'Select a sector first'}
              </option>
              {sectorLeads.map((sl) => (
                <option key={sl.id} value={sl.id}>
                  {sl.full_name} ({sl.email})
                </option>
              ))}
            </select>
          )}
          {sector && !loadingLeads && sectorLeads.length === 0 && (
            <p className="mt-2 text-xs text-amber-700">
              No active Sector Lead for this sector.{' '}
              <Link to="/admin/users/new" className="font-semibold underline">
                Add user
              </Link>{' '}
              with role Sector Lead and matching sector.
            </p>
          )}
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">
            Reason <span className="text-slate-400">(optional)</span>
          </label>
          <textarea
            rows={3}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="e.g. Previous SL transferred to another department"
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-portal-primary focus:ring-2 focus:ring-portal-primary/30"
          />
        </div>

        <button
          type="submit"
          disabled={submitting || !sector || !newSlUserId}
          className="inline-flex items-center gap-2 rounded-lg bg-portal-primary px-5 py-2.5 text-sm font-semibold text-white hover:bg-portal-primary-hover disabled:opacity-50"
        >
          {submitting && <LoadingSpinner size="sm" />}
          {submitting ? 'Transferring…' : 'Transfer Cases'}
        </button>
      </form>

      <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
        <p className="font-medium text-slate-700">What gets moved</p>
        <ul className="mt-2 list-inside list-disc space-y-1 text-xs">
          <li>Open complaints → new sector officer</li>
          <li>Open China proposals → new sector officer</li>
          <li>Direct MOUS — no action needed (sector-based queue)</li>
        </ul>
      </div>
    </div>
  )
}
