import { useEffect, useState } from 'react'
import * as proposalsApi from '../../api/proposals'
import Alert from '../Alert'
import Modal from '../Modal'
import { ENTITY_TYPES } from '../../constants/proposalTemplate'
import { getErrorMessage } from '../../utils/format'
import { normalizeLoginEmail } from '../../utils/proposalDisplay'
import { buildPartyContactsPatchBody } from '../../utils/partyContactProvision'

export function emptyPartyContactInfo(defaultCountry = '') {
  return {
    entity_type: 'business',
    organization_name: '',
    department_ministry: '',
    contact_name: '',
    designation: '',
    email: '',
    phone: '',
    country: defaultCountry,
    city: '',
  }
}

export function partyBInfoFromProposal(proposal) {
  const b = proposal?.party_b_info || {}
  return {
    ...emptyPartyContactInfo('China'),
    entity_type: b.entity_type || proposal?.party_b_entity_type || 'business',
    organization_name: b.organization_name || proposal?.party_b_organization || '',
    department_ministry: b.department_ministry || '',
    contact_name: b.contact_name || proposal?.party_b_name || '',
    designation: b.designation || '',
    email: b.email || proposal?.party_b_email || '',
    phone: b.phone || proposal?.party_b_phone || '',
    country: b.country || proposal?.party_b_country || 'China',
    city: b.city || '',
  }
}

export function partyContactsFormFromProposal(proposal) {
  const a = proposal?.party_a_info || {}
  return {
    party_a_info: {
      ...emptyPartyContactInfo('Pakistan'),
      entity_type: a.entity_type || 'business',
      organization_name: a.organization_name || '',
      department_ministry: a.department_ministry || '',
      contact_name: a.contact_name || '',
      designation: a.designation || '',
      email: a.email || '',
      phone: a.phone || '',
      country: a.country || 'Pakistan',
      city: a.city || '',
    },
    party_b_info: partyBInfoFromProposal(proposal),
  }
}

function ContactField({ label, value, onChange, type = 'text', required = false }) {
  const handleBlur = () => {
    if (type === 'email' && value) {
      onChange(normalizeLoginEmail(value))
    }
  }

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
        onBlur={handleBlur}
        className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 outline-none focus:border-portal-primary focus:ring-2 focus:ring-portal-primary/30"
      />
    </label>
  )
}

function PartyContactFields({ info, onChange }) {
  const set = (key, value) => onChange(key, value)

  return (
    <>
      <label className="block">
        <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
          Entity type
        </span>
        <select
          value={info.entity_type}
          onChange={(e) => set('entity_type', e.target.value)}
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
        value={info.organization_name}
        onChange={(v) => set('organization_name', v)}
      />
      <ContactField
        label="Department / Ministry"
        value={info.department_ministry}
        onChange={(v) => set('department_ministry', v)}
      />
      <ContactField
        label="Contact name"
        value={info.contact_name}
        onChange={(v) => set('contact_name', v)}
        required
      />
      <ContactField
        label="Designation"
        value={info.designation}
        onChange={(v) => set('designation', v)}
      />
      <ContactField
        label="Email"
        type="email"
        value={info.email}
        onChange={(v) => set('email', v)}
        required
      />
      <ContactField
        label="Phone"
        value={info.phone}
        onChange={(v) => set('phone', v)}
      />
      <ContactField
        label="Country"
        value={info.country}
        onChange={(v) => set('country', v)}
      />
      <ContactField label="City" value={info.city} onChange={(v) => set('city', v)} />
    </>
  )
}

/**
 * @param {'a' | 'b' | 'both'} editSides — which sides to show and include in PATCH
 */
export default function ProposalPartyContactsEditor({
  open,
  proposalId,
  proposal,
  editSides = 'both',
  onClose,
  onSaved,
}) {
  const [form, setForm] = useState(() => partyContactsFormFromProposal(proposal))
  const [baseline, setBaseline] = useState(() => partyContactsFormFromProposal(proposal))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const showPartyA = editSides === 'both' || editSides === 'a'
  const showPartyB = editSides === 'both' || editSides === 'b'

  useEffect(() => {
    if (open && proposal) {
      const next = partyContactsFormFromProposal(proposal)
      setForm(next)
      setBaseline(next)
      setError('')
    }
  }, [open, proposal, editSides])

  const setPartyA = (key, value) => {
    setForm((prev) => ({
      ...prev,
      party_a_info: { ...prev.party_a_info, [key]: value },
    }))
  }

  const setPartyB = (key, value) => {
    setForm((prev) => ({
      ...prev,
      party_b_info: { ...prev.party_b_info, [key]: value },
    }))
  }

  const handleSave = async () => {
    setSaving(true)
    setError('')
    try {
      const { body, empty } = buildPartyContactsPatchBody({
        showPartyA,
        showPartyB,
        baseline,
        form,
      })
      if (empty) {
        setError('No contact changes to save.')
        return
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

  const title =
    showPartyA && showPartyB
      ? 'Edit Party A & Party B contacts'
      : showPartyA
        ? 'Edit Party A contacts'
        : 'Edit Party B contacts'

  return (
    <Modal
      open={open}
      title={title}
      onClose={onClose}
      onConfirm={handleSave}
      confirmLabel="Save changes"
      loading={saving}
      panelClassName={`max-h-[90vh] overflow-y-auto ${showPartyA && showPartyB ? 'max-w-4xl' : 'max-w-xl'}`}
    >
      <Alert type="error" message={error} onClose={() => setError('')} />

      <p className="mb-4 text-sm text-slate-600">
        {showPartyA && !showPartyB
          ? 'Update Pakistani company contact details only (email, phone, org, etc.). Use a valid login email (e.g. name@domain.com).'
          : showPartyB && !showPartyA
            ? 'Update Chinese company contact details only (email, phone, org, etc.). Use a valid login email (e.g. name@domain.com).'
            : 'Update Party A / Party B contact details only. Saving links or creates portal logins when appropriate.'}{' '}
        To change Venture Name or MOU title, use <strong>Edit MOU fields</strong>.
      </p>

      <div className={`grid gap-6 ${showPartyA && showPartyB ? 'lg:grid-cols-2' : ''}`}>
        {showPartyA && (
          <fieldset className="space-y-3 rounded-xl border border-slate-200 bg-slate-50/50 p-4">
            <legend className="px-1 text-sm font-semibold text-slate-800">Party A (Pakistan)</legend>
            <PartyContactFields info={form.party_a_info} onChange={setPartyA} />
          </fieldset>
        )}

        {showPartyB && (
          <fieldset className="space-y-3 rounded-xl border border-slate-200 bg-slate-50/50 p-4">
            <legend className="px-1 text-sm font-semibold text-slate-800">Party B (China)</legend>
            <PartyContactFields info={form.party_b_info} onChange={setPartyB} />
          </fieldset>
        )}
      </div>
    </Modal>
  )
}
