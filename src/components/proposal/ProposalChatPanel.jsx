import { useEffect, useRef, useState } from 'react'
import Alert from '../Alert'
import { useProposalChat } from '../../hooks/useProposalChat'
import { ROLE_LABELS } from '../../constants/sectors'

const MAX_MESSAGE_LENGTH = 2000

function formatMessageTime(sentAt) {
  try {
    return new Date(sentAt).toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return ''
  }
}

function roleLabel(role) {
  if (role === 'party_a') return 'Party A'
  if (role === 'party_b') return 'Party B'
  return ROLE_LABELS[role] || role
}

export default function ProposalChatPanel({ proposalId, token, currentUserId, enabled }) {
  const [draft, setDraft] = useState('')
  const [sendError, setSendError] = useState('')
  const messagesEndRef = useRef(null)
  const typingTimeoutRef = useRef(null)

  const {
    messages,
    online,
    connected,
    hasMore,
    loadingOlder,
    error,
    typingUser,
    canSend,
    sendMessage,
    setTyping,
    loadOlder,
  } = useProposalChat(proposalId, token, enabled)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, typingUser])

  const handleDraftChange = (value) => {
    if (value.length > MAX_MESSAGE_LENGTH) return
    setDraft(value)
    setSendError('')

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current)
    setTyping(true)
    typingTimeoutRef.current = setTimeout(() => setTyping(false), 2000)
  }

  const handleSend = (e) => {
    e.preventDefault()
    const trimmed = draft.trim()
    if (!trimmed) {
      setSendError('Message cannot be empty')
      return
    }
    if (trimmed.length > MAX_MESSAGE_LENGTH) {
      setSendError('Message is too long (max 2000 characters)')
      return
    }
    if (!connected) {
      setSendError('Not connected — wait a moment and try again')
      return
    }

    const sent = sendMessage(trimmed)
    if (sent) {
      setDraft('')
      setTyping(false)
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current)
    }
  }

  useEffect(
    () => () => {
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current)
      setTyping(false)
    },
    [setTyping],
  )

  return (
    <section className="flex min-h-[28rem] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-4 sm:px-6">
        <div>
          <h2 className="text-lg font-semibold text-slate-800">Party Chat</h2>
          <p className="text-sm text-slate-500">Live messaging with your counterpart</p>
        </div>
        <div className="flex items-center gap-2">
          <span
            className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${
              connected
                ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200'
                : 'bg-slate-100 text-slate-500 ring-1 ring-slate-200'
            }`}
          >
            <span
              className={`h-1.5 w-1.5 rounded-full ${connected ? 'bg-emerald-500' : 'bg-slate-400'}`}
            />
            {connected ? 'Connected' : 'Connecting…'}
          </span>
        </div>
      </div>

      {online.length > 0 && (
        <div className="border-b border-slate-100 bg-slate-50/80 px-5 py-2.5 text-xs text-slate-600 sm:px-6">
          <span className="font-semibold text-slate-700">Online: </span>
          {online.map((u, i) => (
            <span key={u.userId}>
              {i > 0 && ', '}
              {u.fullName} ({roleLabel(u.role)})
            </span>
          ))}
        </div>
      )}

      <div className="rounded-none border-0 border-b border-slate-100 bg-slate-50/80 px-5 py-2.5 text-xs text-slate-600 sm:px-6">
        {canSend ? (
          <>
            Messages are <strong>saved</strong> and reload after refresh. Party A, Party B, Sector
            Lead, and Super Admin can participate. Use the Activity Timeline for formal milestones.
          </>
        ) : (
          <>
            <strong>Read-only view</strong> — you can read messages but cannot send. China RFP
            observers track engagement progress here.
          </>
        )}
      </div>

      <Alert type="error" message={error || sendError} onClose={() => setSendError('')} />

      <div className="flex-1 space-y-3 overflow-y-auto px-5 py-4 sm:px-6">
        {hasMore && (
          <div className="flex justify-center pb-1">
            <button
              type="button"
              onClick={loadOlder}
              disabled={loadingOlder}
              className="rounded-lg border border-slate-200 bg-white px-4 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-60"
            >
              {loadingOlder ? 'Loading…' : 'Load older messages'}
            </button>
          </div>
        )}
        {messages.length === 0 ? (
          <div className="flex h-full min-h-[12rem] flex-col items-center justify-center text-center text-sm text-slate-500">
            <p className="font-medium text-slate-600">No messages yet</p>
            <p className="mt-1 max-w-sm">
              Say hello to your counterpart. Messages appear here instantly for both parties.
            </p>
          </div>
        ) : (
          messages.map((msg) => {
            const isMine = msg.senderId === currentUserId
            return (
              <div
                key={msg.id}
                className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl px-4 py-3 sm:max-w-[70%] ${
                    isMine
                      ? 'rounded-br-md bg-portal-primary text-slate-900'
                      : 'rounded-bl-md border border-slate-200 bg-slate-50 text-slate-800'
                  }`}
                >
                  {!isMine && (
                    <div className="mb-1 flex flex-wrap items-center gap-2">
                      <span className="text-xs font-semibold text-slate-800">
                        {msg.senderName}
                      </span>
                      <span className="rounded bg-white/80 px-1.5 py-0.5 text-[10px] font-medium text-slate-500">
                        {roleLabel(msg.senderRole)}
                      </span>
                    </div>
                  )}
                  <p className="whitespace-pre-wrap break-words text-sm leading-relaxed">
                    {msg.text}
                  </p>
                  <time className="mt-1.5 block text-[10px] opacity-70">
                    {formatMessageTime(msg.sentAt)}
                  </time>
                </div>
              </div>
            )
          })
        )}
        {typingUser && (
          <p className="text-xs italic text-slate-500">{typingUser} is typing…</p>
        )}
        <div ref={messagesEndRef} />
      </div>

      {canSend ? (
        <form
          onSubmit={handleSend}
          className="border-t border-slate-100 bg-slate-50/50 p-4 sm:p-5"
        >
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
            <div className="min-w-0 flex-1">
              <label htmlFor="proposal-chat-input" className="sr-only">
                Message
              </label>
              <textarea
                id="proposal-chat-input"
                rows={2}
                value={draft}
                onChange={(e) => handleDraftChange(e.target.value)}
                onBlur={() => setTyping(false)}
                placeholder="Type a message…"
                disabled={!connected}
                className="w-full resize-none rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 outline-none focus:border-portal-primary focus:ring-2 focus:ring-portal-primary/20 disabled:bg-slate-100"
              />
              <p className="mt-1 text-right text-[10px] text-slate-400">
                {draft.length}/{MAX_MESSAGE_LENGTH}
              </p>
            </div>
            <button
              type="submit"
              disabled={!connected || !draft.trim()}
              className="shrink-0 rounded-xl bg-portal-primary px-6 py-3 text-sm font-semibold text-white hover:bg-portal-primary-hover disabled:cursor-not-allowed disabled:opacity-50 sm:py-2.5"
            >
              Send
            </button>
          </div>
        </form>
      ) : (
        <div className="border-t border-slate-100 bg-slate-50/80 px-5 py-4 text-center text-sm text-slate-500 sm:px-6">
          Sending messages is not available for your role on this engagement.
        </div>
      )}
    </section>
  )
}
