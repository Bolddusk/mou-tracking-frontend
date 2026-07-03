import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import * as adminSlApi from '../../api/adminSectorLead'
import Alert from '../../components/Alert'
import LoadingSpinner from '../../components/LoadingSpinner'
import Modal from '../../components/Modal'
import { getErrorMessage } from '../../utils/format'

function SectorBadges({ sectors = [], primarySector }) {
  if (!sectors.length) {
    return <span className="text-slate-400">—</span>
  }

  return (
    <div className="flex flex-wrap gap-1">
      {sectors.map((sector) => (
        <span
          key={sector}
          className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ${
            sector === primarySector
              ? 'bg-green-100 text-green-900 ring-green-200'
              : 'bg-slate-100 text-slate-700 ring-slate-200'
          }`}
          title={sector === primarySector ? 'Primary sector' : undefined}
        >
          {sector}
          {sector === primarySector ? ' ★' : ''}
        </span>
      ))}
    </div>
  )
}

export default function SectorLeadAssignmentsPanel({ sectorNames = [] }) {
  const [filterSector, setFilterSector] = useState('')
  const [sectorLeads, setSectorLeads] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [editTarget, setEditTarget] = useState(null)
  const [selectedSectors, setSelectedSectors] = useState([])
  const [primarySector, setPrimarySector] = useState('')
  const [saving, setSaving] = useState(false)

  const activeSectorNames = sectorNames.filter(Boolean)

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const data = await adminSlApi.getAdminSectorLeads(filterSector || undefined)
      setSectorLeads(Array.isArray(data?.sector_leads) ? data.sector_leads : [])
    } catch (err) {
      setError(getErrorMessage(err))
      setSectorLeads([])
    } finally {
      setLoading(false)
    }
  }, [filterSector])

  useEffect(() => {
    load()
  }, [load])

  const openEdit = (lead) => {
    const sectors = lead.sectors?.length
      ? [...lead.sectors]
      : lead.primary_sector
        ? [lead.primary_sector]
        : []
    setEditTarget(lead)
    setSelectedSectors(sectors)
    setPrimarySector(lead.primary_sector || sectors[0] || '')
  }

  const closeEdit = () => {
    setEditTarget(null)
    setSelectedSectors([])
    setPrimarySector('')
  }

  const toggleSector = (sector) => {
    setSelectedSectors((prev) => {
      if (prev.includes(sector)) {
        const next = prev.filter((s) => s !== sector)
        if (primarySector === sector) {
          setPrimarySector(next[0] || '')
        }
        return next
      }
      const next = [...prev, sector]
      if (!primarySector) setPrimarySector(sector)
      return next
    })
  }

  const handleSave = async () => {
    if (!editTarget) return
    if (!selectedSectors.length) {
      setError('Select at least one sector')
      return
    }
    const primary = primarySector && selectedSectors.includes(primarySector)
      ? primarySector
      : selectedSectors[0]

    setSaving(true)
    setError('')
    setSuccess('')
    try {
      await adminSlApi.updateAdminSectorLeadSectors(editTarget.id, {
        sectors: selectedSectors,
        primary_sector: primary,
      })
      setSuccess(`Assignments updated for ${editTarget.full_name || editTarget.email}`)
      closeEdit()
      await load()
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold text-slate-800">Sector Lead Assignments</h3>
          <p className="mt-1 text-sm text-slate-500">
            One sector lead can cover multiple sectors. Before handoff, assign the new officer to
            that sector here.{' '}
            <Link
              to="/admin/settings/sector-officer/reassign"
              className="font-semibold text-portal-primary hover:underline"
            >
              Sector Officer Change →
            </Link>
          </p>
        </div>
        <label className="flex min-w-[200px] flex-col gap-1">
          <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
            Filter by sector
          </span>
          <select
            value={filterSector}
            onChange={(e) => setFilterSector(e.target.value)}
            className="rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-sm outline-none focus:border-portal-primary focus:ring-2 focus:ring-portal-primary/30"
          >
            <option value="">All sector leads</option>
            {activeSectorNames.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
        </label>
      </div>

      <Alert type="error" message={error} onClose={() => setError('')} />
      <Alert type="success" message={success} onClose={() => setSuccess('')} />

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        {loading ? (
          <div className="flex justify-center py-12">
            <LoadingSpinner size="lg" />
          </div>
        ) : sectorLeads.length === 0 ? (
          <p className="py-12 text-center text-sm text-slate-500">
            No sector leads found{filterSector ? ` for ${filterSector}` : ''}.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-[900px] w-full text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-4 py-3 font-semibold">Name</th>
                  <th className="px-4 py-3 font-semibold">Email</th>
                  <th className="px-4 py-3 font-semibold">Primary sector</th>
                  <th className="px-4 py-3 font-semibold">Assigned sectors</th>
                  <th className="px-4 py-3 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {sectorLeads.map((lead) => (
                  <tr key={lead.id} className="hover:bg-slate-50/80">
                    <td className="px-4 py-3 font-medium text-slate-800">{lead.full_name}</td>
                    <td className="px-4 py-3 text-slate-600">{lead.email}</td>
                    <td className="px-4 py-3 text-slate-700">{lead.primary_sector || '—'}</td>
                    <td className="px-4 py-3">
                      <SectorBadges sectors={lead.sectors} primarySector={lead.primary_sector} />
                    </td>
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        onClick={() => openEdit(lead)}
                        className="text-xs font-semibold text-portal-primary hover:underline"
                      >
                        Manage sectors
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Modal
        open={Boolean(editTarget)}
        title={`Sector assignments — ${editTarget?.full_name || editTarget?.email || ''}`}
        onClose={closeEdit}
        onConfirm={handleSave}
        confirmLabel="Save assignments"
        loading={saving}
        confirmDisabled={!selectedSectors.length}
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-600">
            Select all sectors this officer covers. Star (★) marks the primary sector shown on their
            profile.
          </p>
          <div className="max-h-64 space-y-2 overflow-y-auto rounded-lg border border-slate-200 p-3">
            {activeSectorNames.map((name) => {
              const checked = selectedSectors.includes(name)
              return (
                <label
                  key={name}
                  className="flex cursor-pointer items-center justify-between gap-3 rounded-lg px-2 py-1.5 hover:bg-slate-50"
                >
                  <span className="flex items-center gap-2 text-sm text-slate-800">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleSector(name)}
                      className="rounded border-slate-300"
                    />
                    {name}
                  </span>
                  {checked && (
                    <label className="flex items-center gap-1 text-xs text-slate-500">
                      <input
                        type="radio"
                        name="primary_sector"
                        checked={primarySector === name}
                        onChange={() => setPrimarySector(name)}
                      />
                      Primary
                    </label>
                  )}
                </label>
              )
            })}
          </div>
          {selectedSectors.length > 0 && (
            <p className="text-xs text-slate-500">
              {selectedSectors.length} sector(s) selected · Primary:{' '}
              {primarySector || selectedSectors[0]}
            </p>
          )}
        </div>
      </Modal>
    </div>
  )
}
