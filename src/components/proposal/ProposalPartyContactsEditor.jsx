import { useEffect, useState } from 'react'
import * as proposalsApi from '../../api/proposals'
import Alert from '../Alert'
import Modal from '../Modal'
import { ENTITY_TYPES } from '../../constants/proposalTemplate'
import { getErrorMessage } from '../../utils/format'

function emptyPartyA() {
  return {
    entity_type: 'business',
    organization_name: '',
    department_ministry: '',
    contact_name: '',
    designation: '',
    email: '',
    phone: '',
    country: '',
    city: '',
  }
}

export function partyContactsFormFromProposal(proposal) {
  const a = proposal?.party_a_info || {}
  return {
    party_a_info: {
      entity_type: a.entity_type || 'business',
      organization_name: a.organization_name || '',
      department_ministry: a.department_ministry || '',
      contact_name: a.contact_name || '',
      designation: a.designation || '',
      email: a.email || '',
      phone: a.phone || '',
      country: a.country || '',
      city: a.city || '',
    },
    party_b_name: proposal?.party_b_name || '',
    party_b_organization: proposal?.party_b_organization || '',
    party_b_email: proposal?.party_b_email || '',
    party_b_phone: proposal?.party_b_phone || '',
    party_b_country: proposal?.party_b_country || '',
  }
}

function ContactField({ label, value, onChange, type = 'text', required = false }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
        {label}
        {required && <span className="text-red-500"> *</span>}
      </span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 outline-none focus:border-portal-primary focus:ring-2 focus:ring-portal-primary/30"
      />
    </label>
  )
}

export default function ProposalPartyContactsEditor({
  open,
  proposalId,
  proposal,
  onClose,
  onSaved,
}) {
  const [form, setForm] = useState(() => partyContactsFormFromProposal(proposal))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (open && proposal) {
      setForm(partyContactsFormFromProposal(proposal))
      setError('')
    }
  }, [open, proposal])

  const setPartyA = (key, value) => {
    setForm((prev) => ({
      ...prev,
      party_a_info: { ...prev.party_a_info, [key]: value },
    }))
  }

  const setPartyB = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  const handleSave = async () => {
    setSaving(true)
    setError('')
    try {
      const body = {
        party_a_info: { ...form.party_a_info },
        party_b_name: form.party_b_name,
        party_b_organization: form.party_b_organization,
        party_b_email: form.party_b_email,
        party_b_phone: form.party_b_phone,
        party_b_country: form.party_b_country,
      }
      const res = await proposalsApi.patchProposalPartyContacts(proposalId, body)
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
      title="Edit Party A & Party B contacts"
      onClose={onClose}
      onConfirm={handleSave}
      confirmLabel="Save changes"
      loading={saving}
      panelClassName="max-h-[90vh] max-w-4xl overflow-y-auto"
    >
      <Alert type="error" message={error} onClose={() => setError('')} />

      <p className="mb-4 text-sm text-slate-600">
        Update contact details for both parties. On approved proposals, saving Party A contact name
        + email links or creates their portal account; Party B email does the same for the China
        counterpart.
      </p>

      <div className="grid gap-6 lg:grid-cols-2">
        <fieldset className="space-y-3 rounded-xl border border-slate-200 bg-slate-50/50 p-4">
          <legend className="px-1 text-sm font-semibold text-slate-800">Party A (Pakistan)</legend>

          <label className="block">
            <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
              Entity type
            </span>
            <select
              value={form.party_a_info.entity_type}
              onChange={(e) => setPartyA('entity_type', e.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-portal-primary focus:ring-2 focus:ring-portal-primary/30"
            >
              {ENTITY_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </label>

          <ContactField
            label="Organization"
            value={form.party_a_info.organization_name}
            onChange={(v) => setPartyA('organization_name', v)}
          />
          <ContactField
            label="Department / Ministry"
            value={form.party_a_info.department_ministry}
            onChange={(v) => setPartyA('department_ministry', v)}
          />
          <ContactField
            label="Contact name"
            value={form.party_a_info.contact_name}
            onChange={(v) => setPartyA('contact_name', v)}
            required
          />
          <ContactField
            label="Designation"
            value={form.party_a_info.designation}
            onChange={(v) => setPartyA('designation', v)}
          />
          <ContactField
            label="Email"
            type="email"
            value={form.party_a_info.email}
            onChange={(v) => setPartyA('email', v)}
            required
          />
          <ContactField
            label="Phone"
            value={form.party_a_info.phone}
            onChange={(v) => setPartyA('phone', v)}
          />
          <ContactField
            label="Country"
            value={form.party_a_info.country}
            onChange={(v) => setPartyA('country', v)}
          />
          <ContactField
            label="City"
            value={form.party_a_info.city}
            onChange={(v) => setPartyA('city', v)}
          />
        </fieldset>

        <fieldset className="space-y-3 rounded-xl border border-slate-200 bg-slate-50/50 p-4">
          <legend className="px-1 text-sm font-semibold text-slate-800">Party B (China)</legend>

          <ContactField
            label="Full name / signatory"
            value={form.party_b_name}
            onChange={(v) => setPartyB('party_b_name', v)}
          />
          <ContactField
            label="Organization"
            value={form.party_b_organization}
            onChange={(v) => setPartyB('party_b_organization', v)}
          />
          <ContactField
            label="Email"
            type="email"
            value={form.party_b_email}
            onChange={(v) => setPartyB('party_b_email', v)}
          />
          <ContactField
            label="Phone"
            value={form.party_b_phone}
            onChange={(v) => setPartyB('party_b_phone', v)}
          />
          <ContactField
            label="Country"
            value={form.party_b_country}
            onChange={(v) => setPartyB('party_b_country', v)}
          />
        </fieldset>
      </div>
    </Modal>
  )
}
