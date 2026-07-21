import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import * as proposalsApi from '../../api/proposals'
import Alert from '../Alert'
import LoadingSpinner from '../LoadingSpinner'
import Modal from '../Modal'
import { useProposalChat } from '../../hooks/useProposalChat'
import { ROLE_LABELS } from '../../constants/sectors'
import { getErrorMessage } from '../../utils/format'

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

function formatPreviewTime(sentAt) {
  if (!sentAt) return ''
  try {
    const d = new Date(sentAt)
    const now = new Date()
    const sameDay = d.toDateString() === now.toDateString()
    if (sameDay) {
      return d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
    }
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
  } catch {
    return ''
  }
}

function roleLabel(role) {
  if (role === 'party_a') return 'Party A'
  if (role === 'party_b') return 'Party B'
  return ROLE_LABELS[role] || role
}

function conversationTitle(conv) {
  if (!conv) return 'Chat'
  if (conv.type === 'group' || conv.title === 'General') return conv.title || 'General'
  if (Array.isArray(conv.peers) && conv.peers.length >= 2) {
    return conv.title || `${conv.peers[0].full_name} ↔ ${conv.peers[1].full_name}`
  }
  return conv.title || conv.peer?.full_name || 'Direct chat'
}

function sortConversations(list) {
  const items = Array.isArray(list) ? [...list] : []
  items.sort((a, b) => {
    const aGeneral = a.type === 'group' || a.title === 'General'
    const bGeneral = b.type === 'group' || b.title === 'General'
    if (aGeneral && !bGeneral) return -1
    if (!aGeneral && bGeneral) return 1
    return new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0)
  })
  return items
}

export default function ProposalChatPanel({ proposalId, token, currentUserId, enabled }) {
  const [inboxLoading, setInboxLoading] = useState(true)
  const [inboxError, setInboxError] = useState('')
  const [conversations, setConversations] = useState([])
  const [participants, setParticipants] = useState([])
  const [inboxCanSend, setInboxCanSend] = useState(true)
  const [activeId, setActiveId] = useState(null)
  const [newChatOpen, setNewChatOpen] = useState(false)
  const [startingDm, setStartingDm] = useState(false)
  const [draft, setDraft] = useState('')
  const [sendError, setSendError] = useState('')
  const messagesEndRef = useRef(null)
  const typingTimeoutRef = useRef(null)
  const markedReadRef = useRef(new Set())

  const refreshInbox = useCallback(async () => {
    if (!proposalId) return
    try {
      const [convRes, partRes] = await Promise.all([
        proposalsApi.getProposalChatConversations(proposalId),
        proposalsApi.getProposalChatParticipants(proposalId),
      ])
      const list = sortConversations(convRes?.conversations || [])
      setConversations(list)
      setParticipants(partRes?.participants || [])
      if (typeof convRes?.canSend === 'boolean') setInboxCanSend(convRes.canSend)
      setInboxError('')
      return list
    } catch (err) {
      setInboxError(getErrorMessage(err))
      return null
    }
  }, [proposalId])

  useEffect(() => {
    if (!enabled || !proposalId) return undefined
    let cancelled = false
    setInboxLoading(true)
    refreshInbox()
      .then((list) => {
        if (cancelled || !list?.length) return
        setActiveId((prev) => {
          if (prev && list.some((c) => Number(c.id) === Number(prev))) return prev
          const general = list.find((c) => c.type === 'group' || c.title === 'General')
          return general?.id ?? list[0].id
        })
      })
      .finally(() => {
        if (!cancelled) setInboxLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [enabled, proposalId, refreshInbox])

  const handleConversationsUpdated = useCallback(
    (payload) => {
      if (payload?.proposalId != null && Number(payload.proposalId) !== Number(proposalId)) {
        return
      }
      setConversations((prev) => {
        const exists = prev.some((c) => Number(c.id) === Number(payload.conversationId))
        if (!exists) {
          refreshInbox()
          return prev
        }
        const next = prev.map((c) => {
          if (Number(c.id) !== Number(payload.conversationId)) return c
          const isActive = Number(c.id) === Number(activeId)
          return {
            ...c,
            lastMessage: payload.lastMessage || c.lastMessage,
            updatedAt: payload.lastMessage?.sentAt || new Date().toISOString(),
            unreadCount: isActive
              ? 0
              : (Number(c.unreadCount) || 0) + (payload.lastMessage ? 1 : 0),
          }
        })
        return sortConversations(next)
      })
    },
    [proposalId, activeId, refreshInbox],
  )

  const {
    messages,
    online,
    connected,
    hasMore,
    loadingOlder,
    error,
    typingUser,
    canSend: threadCanSend,
    sendMessage,
    setTyping,
    loadOlder,
  } = useProposalChat(proposalId, token, enabled && activeId != null, activeId, {
    onConversationsUpdated: handleConversationsUpdated,
  })

  const canSend = threadCanSend && inboxCanSend

  const activeConversation = useMemo(
    () => conversations.find((c) => Number(c.id) === Number(activeId)) || null,
    [conversations, activeId],
  )

  // Mark read when opening a thread / after new messages arrive
  useEffect(() => {
    if (!enabled || !proposalId || !activeId) return
    const lastId = messages.length ? messages[messages.length - 1].id : undefined
    const key = `${activeId}:${lastId ?? 'empty'}`
    if (markedReadRef.current.has(key)) return
    markedReadRef.current.add(key)

    proposalsApi
      .markProposalChatRead(proposalId, activeId, lastId)
      .then(() => {
        setConversations((prev) =>
          prev.map((c) => (Number(c.id) === Number(activeId) ? { ...c, unreadCount: 0 } : c)),
        )
      })
      .catch(() => {
        markedReadRef.current.delete(key)
      })
  }, [enabled, proposalId, activeId, messages])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, typingUser])

  useEffect(() => {
    setDraft('')
    setSendError('')
  }, [activeId])

  const handleDraftChange = (value) => {
    if (value.length > MAX_MESSAGE_LENGTH) return
    setDraft(value)
    setSendError('')
    if (!canSend) return
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
    if (!connected) {
      setSendError('Not connected — wait a moment and try again')
      return
    }
    const sent = sendMessage(trimmed)
    if (sent) {
      setDraft('')
      setTyping(false)
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current)
      setConversations((prev) =>
        sortConversations(
          prev.map((c) =>
            Number(c.id) === Number(activeId)
              ? {
                  ...c,
                  unreadCount: 0,
                  updatedAt: new Date().toISOString(),
                  lastMessage: {
                    ...(c.lastMessage || {}),
                    text: trimmed,
                    senderId: currentUserId,
                    sentAt: new Date().toISOString(),
                  },
                }
              : c,
          ),
        ),
      )
    }
  }

  useEffect(
    () => () => {
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current)
      setTyping(false)
    },
    [setTyping],
  )

  const handleStartDm = async (peerUserId) => {
    setStartingDm(true)
    setInboxError('')
    try {
      const res = await proposalsApi.startProposalChatConversation(proposalId, peerUserId)
      const conv = res?.conversation
      const list = (await refreshInbox()) || []
      const id = conv?.id ?? list.find((c) => Number(c.peer?.id) === Number(peerUserId))?.id
      if (id != null) setActiveId(id)
      setNewChatOpen(false)
    } catch (err) {
      setInboxError(getErrorMessage(err))
    } finally {
      setStartingDm(false)
    }
  }

  if (inboxLoading) {
    return (
      <section className="flex min-h-[28rem] items-center justify-center rounded-2xl border border-slate-200 bg-white shadow-sm">
        <LoadingSpinner size="lg" />
      </section>
    )
  }

  return (
    <section className="flex min-h-[32rem] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      {/* Left: conversation list */}
      <aside className="flex w-full max-w-[17.5rem] shrink-0 flex-col border-r border-slate-200 bg-slate-50/40 sm:max-w-[20rem]">
        <div className="flex items-center justify-between gap-2 border-b border-slate-200 px-3 py-3">
          <div>
            <h2 className="text-sm font-semibold text-slate-800">MOU Chat</h2>
            <p className="text-[11px] text-slate-500">General + private DMs</p>
          </div>
          {inboxCanSend && (
            <button
              type="button"
              onClick={() => setNewChatOpen(true)}
              className="rounded-lg bg-portal-primary px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-portal-primary-hover"
            >
              New chat
            </button>
          )}
        </div>

        <div className="flex-1 overflow-y-auto">
          {conversations.length === 0 ? (
            <p className="px-3 py-8 text-center text-xs text-slate-500">No conversations yet.</p>
          ) : (
            conversations.map((conv) => {
              const selected = Number(conv.id) === Number(activeId)
              const preview = conv.lastMessage?.text || 'No messages yet'
              const unread = Number(conv.unreadCount) || 0
              return (
                <button
                  key={conv.id}
                  type="button"
                  onClick={() => setActiveId(conv.id)}
                  className={`flex w-full items-start gap-2 border-b border-slate-100 px-3 py-3 text-left transition ${
                    selected
                      ? 'bg-white shadow-sm ring-1 ring-inset ring-slate-200'
                      : 'hover:bg-white/80'
                  }`}
                >
                  <div
                    className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                      conv.type === 'group'
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-slate-200 text-slate-700'
                    }`}
                  >
                    {conv.type === 'group' ? 'G' : (conversationTitle(conv).slice(0, 1) || '?')}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-1">
                      <p className="truncate text-sm font-semibold text-slate-800">
                        {conversationTitle(conv)}
                      </p>
                      <span className="shrink-0 text-[10px] text-slate-400">
                        {formatPreviewTime(conv.lastMessage?.sentAt || conv.updatedAt)}
                      </span>
                    </div>
                    <div className="mt-0.5 flex items-center justify-between gap-2">
                      <p className="truncate text-xs text-slate-500">{preview}</p>
                      {unread > 0 && (
                        <span className="inline-flex min-w-[1.25rem] shrink-0 items-center justify-center rounded-full bg-portal-primary px-1.5 py-0.5 text-[10px] font-bold text-white">
                          {unread > 99 ? '99+' : unread}
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              )
            })
          )}
        </div>
      </aside>

      {/* Right: active thread */}
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 px-4 py-3">
          <div className="min-w-0">
            <h3 className="truncate text-base font-semibold text-slate-800">
              {conversationTitle(activeConversation)}
            </h3>
            <p className="text-xs text-slate-500">
              {activeConversation?.type === 'direct'
                ? 'Private conversation on this MOU'
                : 'Everyone on this MOU can see General'}
              {online.length > 0
                ? ` · ${online.length} online`
                : ''}
            </p>
          </div>
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

        <div className="border-b border-slate-100 bg-slate-50/80 px-4 py-2 text-xs text-slate-600">
          Informal chat only — use the Activity Timeline for formal milestones.
          {!canSend && (
            <span className="ml-1 font-semibold text-amber-800">
              Read-only for your role on this thread.
            </span>
          )}
        </div>

        <Alert
          type="error"
          message={inboxError || error || sendError}
          onClose={() => {
            setSendError('')
            setInboxError('')
          }}
        />

        <div className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
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

          {!activeId ? (
            <div className="flex min-h-[12rem] items-center justify-center text-sm text-slate-500">
              Select a conversation
            </div>
          ) : messages.length === 0 ? (
            <div className="flex min-h-[12rem] flex-col items-center justify-center text-center text-sm text-slate-500">
              <p className="font-medium text-slate-600">No messages yet</p>
              <p className="mt-1 max-w-sm">
                Start the conversation. Direct messages stay private to this thread.
              </p>
            </div>
          ) : (
            messages.map((msg) => {
              const isMine = Number(msg.senderId) === Number(currentUserId)
              return (
                <div
                  key={msg.id}
                  className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[85%] rounded-2xl px-4 py-3 sm:max-w-[75%] ${
                      isMine
                        ? 'rounded-br-md bg-portal-primary text-white shadow-sm'
                        : 'rounded-bl-md border border-emerald-100 bg-emerald-50/80 text-slate-800'
                    }`}
                  >
                    {!isMine && (
                      <div className="mb-1 flex flex-wrap items-center gap-2">
                        <span className="text-xs font-semibold text-emerald-900">
                          {msg.senderName}
                        </span>
                        <span className="rounded bg-white/90 px-1.5 py-0.5 text-[10px] font-medium text-emerald-700">
                          {roleLabel(msg.senderRole)}
                        </span>
                      </div>
                    )}
                    <p className="whitespace-pre-wrap break-words text-sm leading-relaxed">
                      {msg.text}
                    </p>
                    <time
                      className={`mt-1.5 block text-[10px] ${
                        isMine ? 'text-emerald-100' : 'text-slate-500'
                      }`}
                    >
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
            className="border-t border-slate-100 bg-slate-50/50 p-3 sm:p-4"
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
                  disabled={!connected || !activeId}
                  className="w-full resize-none rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 outline-none focus:border-portal-primary focus:ring-2 focus:ring-portal-primary/20 disabled:bg-slate-100"
                />
                <p className="mt-1 text-right text-[10px] text-slate-400">
                  {draft.length}/{MAX_MESSAGE_LENGTH}
                </p>
              </div>
              <button
                type="submit"
                disabled={!connected || !draft.trim() || !activeId}
                className="shrink-0 rounded-xl bg-portal-primary px-6 py-3 text-sm font-semibold text-white hover:bg-portal-primary-hover disabled:cursor-not-allowed disabled:opacity-50 sm:py-2.5"
              >
                Send
              </button>
            </div>
          </form>
        ) : (
          <div className="border-t border-slate-100 bg-slate-50/80 px-4 py-3 text-center text-sm text-slate-500">
            Sending is not available for your role on this conversation.
          </div>
        )}
      </div>

      <Modal
        open={newChatOpen}
        title="New chat"
        onClose={() => setNewChatOpen(false)}
        hideFooter
        loading={startingDm}
        panelClassName="max-w-md"
      >
        <p className="mb-3 text-sm text-slate-600">
          Pick someone on this MOU. Only linked parties, sector leads, and super admins appear.
        </p>
        {participants.length === 0 ? (
          <p className="rounded-lg bg-slate-50 px-3 py-4 text-center text-sm text-slate-500">
            No other participants available to message.
          </p>
        ) : (
          <ul className="max-h-72 space-y-1 overflow-y-auto">
            {participants.map((p) => {
              const existing = conversations.some(
                (c) => c.type === 'direct' && Number(c.peer?.id) === Number(p.id),
              )
              return (
                <li key={p.id}>
                  <button
                    type="button"
                    disabled={startingDm}
                    onClick={() => handleStartDm(p.id)}
                    className="flex w-full items-center justify-between gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-left hover:border-portal-primary/40 hover:bg-emerald-50/40 disabled:opacity-50"
                  >
                    <span>
                      <span className="block text-sm font-semibold text-slate-800">
                        {p.full_name}
                      </span>
                      <span className="text-xs text-slate-500">
                        {roleLabel(p.role)}
                        {p.email ? ` · ${p.email}` : ''}
                        {existing ? ' · Open existing' : ''}
                      </span>
                    </span>
                    <span className="text-xs font-semibold text-portal-primary">
                      {existing ? 'Open' : 'Chat'}
                    </span>
                  </button>
                </li>
              )
            })}
          </ul>
        )}
        <div className="mt-4 flex justify-end">
          <button
            type="button"
            onClick={() => setNewChatOpen(false)}
            disabled={startingDm}
            className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50"
          >
            Cancel
          </button>
        </div>
      </Modal>
    </section>
  )
}
