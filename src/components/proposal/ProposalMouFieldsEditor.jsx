import { useEffect, useMemo, useState } from 'react'
import * as proposalsApi from '../../api/proposals'
import { COOPERATION_MODE_LABELS } from '../../constants/proposalFilters'
import { MOU_OPERATIONAL_STATUS_OPTIONS } from '../../utils/mouConferenceFields'
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
  const conferences = useMemo(() => catalog?.conferences || [], [catalog?.conferences])
  const sifcCategories = useMemo(() => catalog?.sifc_categories || [], [catalog?.sifc_categories])

  const selectedConference = useMemo(
    () =>
      conferences.find(
        (c) => (c.key || c.conference_key) === form.conference_key
      ),
    [conferences, form.conference_key]
  )

  const cooperationModes = catalog?.catalog?.enums?.cooperation_mode || ['mou', 'jv', 'agreement']
  const operationalStatuses =
    catalog?.catalog?.enums?.mou_operational_status || MOU_OPERATIONAL_STATUS_OPTIONS

  const editable = catalog?.editable !== false
  const locked = catalog?.locked === true
  const canChangeSector = catalog?.can_change_sector === true

  const setScalar = (key, value) => setForm((prev) => ({ ...prev, [key]: value }))
  const setEs = (key, value) =>
    setForm((prev) => ({
      ...prev,
      executive_summary: { ...prev.executive_summary, [key]: value },
    }))

  const handleSave = async () => {
    const patch = buildProposalFieldsPatch(baseline, form, { isAdmin, canChangeSector })
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
            <FieldLabel hint={!canChangeSector ? 'admin only' : undefined}>Sector</FieldLabel>
            <select
              value={form.sector}
              onChange={(e) => setScalar('sector', e.target.value)}
              disabled={!canChangeSector || catalogLoading}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-portal-primary focus:ring-2 focus:ring-portal-primary/30 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-600"
            >
              {!canChangeSector && form.sector ? (
                <option value={form.sector}>{form.sector}</option>
              ) : (
                <option value="">Select sector…</option>
              )}
              {canChangeSector &&
                sectors.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              {canChangeSector && form.sector && !sectors.includes(form.sector) && (
                <option value={form.sector}>{form.sector} (current)</option>
              )}
            </select>
          </label>
          <div className="grid gap-3 sm:grid-cols-3">
            <label className="block">
              <FieldLabel>Cooperation mode</FieldLabel>
              <select
                value={form.cooperation_mode}
                onChange={(e) => setScalar('cooperation_mode', e.target.value)}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-portal-primary focus:ring-2 focus:ring-portal-primary/30"
              >
                <option value="">Select mode…</option>
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
            <label className="block">
              <FieldLabel>Status</FieldLabel>
              <select
                value={form.executive_summary.mou_operational_status || operationalStatuses[0]}
                onChange={(e) => setEs('mou_operational_status', e.target.value)}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-portal-primary focus:ring-2 focus:ring-portal-primary/30"
              >
                {operationalStatuses.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </Section>

        <Section title="Parties">
          <label className="block">
            <FieldLabel>Pakistani company</FieldLabel>
            <TextInput value={form.company_name} onChange={(v) => setScalar('company_name', v)} />
          </label>
          <label className="block">
            <FieldLabel>Chinese company</FieldLabel>
            <TextInput value={form.party_b_name} onChange={(v) => setScalar('party_b_name', v)} />
          </label>
        </Section>

        <Section title="Conference">
          <label className="block">
            <FieldLabel>Conference</FieldLabel>
            <select
              value={form.conference_key}
              onChange={(e) => setScalar('conference_key', e.target.value)}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-portal-primary focus:ring-2 focus:ring-portal-primary/30"
            >
              <option value="">Select conference…</option>
              {form.conference_key && !selectedConference && (
                <option value={form.conference_key}>
                  {proposal?.conference_name || form.conference_key} (current)
                </option>
              )}
              {conferences.map((c) => {
                const key = c.key || c.conference_key
                return (
                  <option key={key || c.id} value={key}>
                    {c.name}
                  </option>
                )
              })}
            </select>
            {selectedConference && (
              <p className="mt-1 text-xs text-slate-500">
                Key: {selectedConference.key || selectedConference.conference_key}
              </p>
            )}
          </label>
        </Section>

        <Section title="MOU details (historic / executive summary)">
          <label className="block">
            <FieldLabel>SIFC category</FieldLabel>
            <select
              value={form.executive_summary.sifc_category}
              onChange={(e) => setEs('sifc_category', e.target.value)}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-portal-primary focus:ring-2 focus:ring-portal-primary/30"
            >
              <option value="">Select category…</option>
              {form.executive_summary.sifc_category &&
                !sifcCategories.some((c) => c.name === form.executive_summary.sifc_category) && (
                  <option value={form.executive_summary.sifc_category}>
                    {form.executive_summary.sifc_category} (current)
                  </option>
                )}
              {sifcCategories.map((cat) => (
                <option key={cat.id || cat.name} value={cat.name}>
                  {cat.name}
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

      </div>
    </Modal>
  )
}
