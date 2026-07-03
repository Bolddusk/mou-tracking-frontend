import { useEffect, useMemo, useState } from 'react'
import * as proposalsApi from '../../api/proposals'
import { COOPERATION_MODE_LABELS } from '../../constants/proposalFilters'
import Alert from '../Alert'
import Modal from '../Modal'
import { getErrorMessage } from '../../utils/format'
import {
  buildProposalFieldsPatch,
  proposalFieldsFormFromProposal,
} from '../../utils/proposalFieldsPatch'

function FieldLabel({ children, hint }) {
  return (
    <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
      {children}
      {hint && <span className="ml-1 font-normal normal-case text-slate-400">({hint})</span>}
    </span>
  )
}

function TextInput({ value, onChange, type = 'text' }) {
  return (
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 outline-none focus:border-portal-primary focus:ring-2 focus:ring-portal-primary/30"
    />
  )
}

function TextArea({ value, onChange, rows = 3 }) {
  return (
    <textarea
      rows={rows}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 outline-none focus:border-portal-primary focus:ring-2 focus:ring-portal-primary/30"
    />
  )
}

function Section({ title, children }) {
  return (
    <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50/50 p-4">
      <h4 className="text-sm font-semibold text-slate-800">{title}</h4>
      {children}
    </div>
  )
}

export default function ProposalMouFieldsEditor({
  open,
  proposalId,
  proposal,
  isAdmin = false,
  onClose,
  onSaved,
}) {
  const [catalog, setCatalog] = useState(null)
  const [catalogLoading, setCatalogLoading] = useState(false)
  const [form, setForm] = useState(() => proposalFieldsFormFromProposal(proposal))
  const [baseline, setBaseline] = useState(() => proposalFieldsFormFromProposal(proposal))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!open || !proposal) return
    const initial = proposalFieldsFormFromProposal(proposal)
    setForm(initial)
    setBaseline(initial)
    setError('')
  }, [open, proposal])

  useEffect(() => {
    if (!open || !proposalId) return
    let cancelled = false
    setCatalogLoading(true)
    proposalsApi
      .getProposalEditableFields(proposalId)
      .then((data) => {
        if (!cancelled) setCatalog(data)
      })
      .catch((err) => {
        if (!cancelled) setError(getErrorMessage(err))
      })
      .finally(() => {
        if (!cancelled) setCatalogLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [open, proposalId])

  const sectors = useMemo(() => catalog?.sectors || [], [catalog?.sectors])

  const cooperationModes = catalog?.catalog?.enums?.cooperation_mode || ['mou', 'jv', 'agreement']
  const operationalStatuses = catalog?.catalog?.enums?.mou_operational_status || [
    'Active',
    'Inactive',
    'In Execution',
  ]

  const editable = catalog?.editable !== false
  const locked = catalog?.locked === true

  const setScalar = (key, value) => setForm((prev) => ({ ...prev, [key]: value }))
  const setEs = (key, value) =>
    setForm((prev) => ({
      ...prev,
      executive_summary: { ...prev.executive_summary, [key]: value },
    }))
  const setPartyAOrg = (value) =>
    setForm((prev) => ({
      ...prev,
      party_a_info: { ...prev.party_a_info, organization_name: value },
    }))

  const handleSave = async () => {
    const patch = buildProposalFieldsPatch(baseline, form, { isAdmin })
    if (!Object.keys(patch).length) {
      onClose?.()
      return
    }

    setSaving(true)
    setError('')
    try {
      const res = await proposalsApi.patchProposalFields(proposalId, patch)
      onSaved?.(res)
      onClose?.()
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      open={open}
      title="Edit MOU fields"
      onClose={onClose}
      onConfirm={handleSave}
      confirmLabel="Save changes"
      loading={saving || catalogLoading}
      confirmDisabled={!editable || locked || catalogLoading}
      panelClassName="max-w-3xl"
    >
      <div className="max-h-[70vh] space-y-4 overflow-y-auto pr-1">
        <Alert type="error" message={error} onClose={() => setError('')} />

        {locked && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
            {catalog?.reason || 'This MOU is locked and cannot be edited.'}
          </div>
        )}

        {!editable && !locked && (
          <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600">
            {catalog?.reason || 'You do not have permission to edit these fields.'}
          </div>
        )}

        <Section title="Sector & agreement">
          <label className="block">
            <FieldLabel>Sector</FieldLabel>
            <select
              value={form.sector}
              onChange={(e) => setScalar('sector', e.target.value)}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-portal-primary focus:ring-2 focus:ring-portal-primary/30"
            >
              <option value="">Select sector…</option>
              {sectors.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </label>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block">
              <FieldLabel>Cooperation mode</FieldLabel>
              <select
                value={form.cooperation_mode}
                onChange={(e) => setScalar('cooperation_mode', e.target.value)}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-portal-primary focus:ring-2 focus:ring-portal-primary/30"
              >
                <option value="">—</option>
                {cooperationModes.map((mode) => (
                  <option key={mode} value={mode}>
                    {COOPERATION_MODE_LABELS[mode] || mode}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <FieldLabel>MoU value (USD million)</FieldLabel>
              <TextInput
                value={form.investment_value_usd}
                onChange={(v) => setScalar('investment_value_usd', v)}
              />
            </label>
          </div>
          <label className="block">
            <FieldLabel>Agriculture sub-sector</FieldLabel>
            <TextInput value={form.mou_sub_sector} onChange={(v) => setScalar('mou_sub_sector', v)} />
          </label>
        </Section>

        <Section title="Parties">
          <label className="block">
            <FieldLabel>Pakistani company</FieldLabel>
            <TextInput value={form.company_name} onChange={(v) => setScalar('company_name', v)} />
          </label>
          <label className="block">
            <FieldLabel>Party A organization</FieldLabel>
            <TextInput value={form.party_a_info.organization_name} onChange={setPartyAOrg} />
          </label>
          <label className="block">
            <FieldLabel>Chinese company</FieldLabel>
            <TextInput value={form.party_b_name} onChange={(v) => setScalar('party_b_name', v)} />
          </label>
        </Section>

        <Section title="Conference">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block">
              <FieldLabel>Conference key</FieldLabel>
              <TextInput value={form.conference_key} onChange={(v) => setScalar('conference_key', v)} />
            </label>
            <label className="block">
              <FieldLabel>Conference name</FieldLabel>
              <TextInput
                value={form.conference_name}
                onChange={(v) => setScalar('conference_name', v)}
              />
            </label>
          </div>
        </Section>

        <Section title="MOU details (historic / executive summary)">
          <label className="block">
            <FieldLabel>SIFC category</FieldLabel>
            <TextInput
              value={form.executive_summary.sifc_category}
              onChange={(v) => setEs('sifc_category', v)}
            />
          </label>
          <label className="block">
            <FieldLabel>Operational status</FieldLabel>
            <select
              value={form.executive_summary.mou_operational_status}
              onChange={(e) => setEs('mou_operational_status', e.target.value)}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-portal-primary focus:ring-2 focus:ring-portal-primary/30"
            >
              <option value="">—</option>
              {operationalStatuses.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <FieldLabel>Outcome / description</FieldLabel>
            <TextArea
              rows={3}
              value={form.proposal_description}
              onChange={(v) => setScalar('proposal_description', v)}
            />
          </label>
          <label className="block">
            <FieldLabel>Project overview</FieldLabel>
            <TextArea
              rows={2}
              value={form.executive_summary.project_overview}
              onChange={(v) => setEs('project_overview', v)}
            />
          </label>
          <label className="block">
            <FieldLabel>Progress</FieldLabel>
            <TextArea
              rows={4}
              value={form.executive_summary.progress}
              onChange={(v) => setEs('progress', v)}
            />
          </label>
          <label className="block">
            <FieldLabel>Bottlenecks</FieldLabel>
            <TextArea
              rows={2}
              value={form.executive_summary.bottlenecks}
              onChange={(v) => setEs('bottlenecks', v)}
            />
          </label>
          <label className="block">
            <FieldLabel>Action taken</FieldLabel>
            <TextArea
              rows={2}
              value={form.executive_summary.action_taken}
              onChange={(v) => setEs('action_taken', v)}
            />
          </label>
          <label className="block">
            <FieldLabel>Tentative timelines</FieldLabel>
            <TextInput
              value={form.executive_summary.tentative_timeline}
              onChange={(v) => setEs('tentative_timeline', v)}
            />
          </label>
          <label className="block">
            <FieldLabel>Location</FieldLabel>
            <TextInput
              value={form.executive_summary.location}
              onChange={(v) => setEs('location', v)}
            />
          </label>
        </Section>

        {isAdmin && (
          <Section title="Admin only">
            <label className="block">
              <FieldLabel>External reference</FieldLabel>
              <TextInput
                value={form.external_reference}
                onChange={(v) => setScalar('external_reference', v)}
              />
            </label>
          </Section>
        )}

        <p className="text-xs text-slate-500">
          Workflow status (draft/submitted/approved) is not changed here — use approve/reject actions.
          Only modified fields are sent to the server.
        </p>
      </div>
    </Modal>
  )
}
