import { useState } from 'react'
import Modal from './Modal'

export default function PartyBCredentialsModal({
  open,
  credentials,
  title,
  subtitle,
  side = 'B',
  onClose,
}) {
  const [copiedAll, setCopiedAll] = useState(false)

  if (!credentials) return null

  const partyLabel = side === 'A' ? 'Party A' : 'Party B'
  const modalTitle = title || `${partyLabel} login credentials`

  const copyAll = () => {
    const lines = [
      `Email: ${credentials.email}`,
      `Temporary password: ${credentials.temporary_password}`,
      `Login URL: ${credentials.login_url}`,
    ]
    if (credentials.must_change_password) {
      lines.push(`Note: ${partyLabel} must change password on first login.`)
    }
    navigator.clipboard?.writeText(lines.join('\n'))
    setCopiedAll(true)
    setTimeout(() => setCopiedAll(false), 2000)
  }

  return (
    <Modal open={open} title={modalTitle} onClose={onClose} hideFooter>
      <div className="space-y-4 text-sm text-slate-700">
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-amber-900">
          Share these credentials with {partyLabel} securely. Password is shown once — not stored
          in plain text.
        </p>
        {subtitle && <p className="text-sm text-slate-600">{subtitle}</p>}
        <CredentialRow label="Email" value={credentials.email} copyable />
        <CredentialRow label="Temporary password" value={credentials.temporary_password} copyable />
        <CredentialRow label="Login URL" value={credentials.login_url} copyable />
        {credentials.must_change_password && (
          <p className="rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-xs text-green-900">
            {partyLabel} must change this temporary password on first login.
          </p>
        )}
        <button
          type="button"
          onClick={copyAll}
          className="w-full rounded-lg border border-slate-200 bg-white py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
        >
          {copiedAll ? 'Copied to clipboard' : 'Copy all credentials'}
        </button>
        <button
          type="button"
          onClick={onClose}
          className="w-full rounded-lg bg-sidebar py-2.5 text-sm font-semibold text-white hover:bg-sidebar-hover"
        >
          Done
        </button>
      </div>
    </Modal>
  )
}

function CredentialRow({ label, value, copyable }) {
  const copy = () => {
    if (value) navigator.clipboard?.writeText(String(value))
  }

  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <div className="mt-1 flex items-center justify-between gap-2">
        <code className="break-all text-sm font-medium text-slate-800">{value}</code>
        {copyable && (
          <button
            type="button"
            onClick={copy}
            className="shrink-0 rounded border border-slate-200 bg-white px-2 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50"
          >
            Copy
          </button>
        )}
      </div>
    </div>
  )
}
