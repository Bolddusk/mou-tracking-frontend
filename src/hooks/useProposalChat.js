import { useCallback, useEffect, useRef, useState } from 'react'
import { io } from 'socket.io-client'
import * as proposalsApi from '../api/proposals'

const SOCKET_URL = (import.meta.env.VITE_API_URL || 'http://localhost:5000').replace(/\/$/, '')
const JOIN_HISTORY_LIMIT = 100
const OLDER_PAGE_LIMIT = 50

function appendMessage(prev, msg) {
  if (prev.some((m) => m.id === msg.id)) return prev
  return [...prev, msg]
}

function mergeOlderMessages(prev, older) {
  const merged = [...(older || []), ...prev]
  const seen = new Set()
  return merged.filter((m) => {
    if (seen.has(m.id)) return false
    seen.add(m.id)
    return true
  })
}

function sameConversation(msgConversationId, activeId) {
  if (activeId == null) return msgConversationId == null
  return Number(msgConversationId) === Number(activeId)
}

/**
 * Socket chat for one MOU conversation.
 * @param {number|string} proposalId
 * @param {string} token
 * @param {boolean} enabled
 * @param {number|null} conversationId — required for inbox; omit/null = legacy General join
 * @param {{ onConversationsUpdated?: Function }} options
 */
export function useProposalChat(
  proposalId,
  token,
  enabled = true,
  conversationId = null,
  options = {},
) {
  const { onConversationsUpdated } = options
  const socketRef = useRef(null)
  const conversationIdRef = useRef(conversationId)
  const onUpdatedRef = useRef(onConversationsUpdated)
  const previousConversationRef = useRef(null)

  const [messages, setMessages] = useState([])
  const [online, setOnline] = useState([])
  const [connected, setConnected] = useState(false)
  const [hasMore, setHasMore] = useState(false)
  const [loadingOlder, setLoadingOlder] = useState(false)
  const [error, setError] = useState(null)
  const [typingUser, setTypingUser] = useState(null)
  const [proposalTitle, setProposalTitle] = useState('')
  const [canSend, setCanSend] = useState(true)
  const [joinedConversationId, setJoinedConversationId] = useState(null)
  const [conversationType, setConversationType] = useState(null)

  useEffect(() => {
    conversationIdRef.current = conversationId
  }, [conversationId])

  useEffect(() => {
    onUpdatedRef.current = onConversationsUpdated
  }, [onConversationsUpdated])

  // Connect socket once per enabled proposal
  useEffect(() => {
    if (!enabled || !proposalId || !token) return undefined

    setError(null)
    setConnected(false)

    const socket = io(SOCKET_URL, {
      path: '/socket.io',
      auth: { token },
      transports: ['websocket', 'polling'],
    })
    socketRef.current = socket

    socket.on('connect', () => {
      setConnected(true)
      setError(null)
      const activeId = conversationIdRef.current
      if (activeId != null) {
        socket.emit('chat:join', { proposalId, conversationId: Number(activeId) })
      }
    })

    socket.on('disconnect', () => setConnected(false))

    socket.on('connect_error', (err) => {
      setConnected(false)
      setError(err.message || 'Could not connect to chat')
    })

    socket.on('chat:joined', (data) => {
      setOnline(data.online || [])
      if (data.proposalTitle) setProposalTitle(data.proposalTitle)
      if (typeof data.canSend === 'boolean') setCanSend(data.canSend)
      if (data.conversationId != null) setJoinedConversationId(Number(data.conversationId))
      if (data.type) setConversationType(data.type)
      const history = data.messages || []
      setMessages(history)
      setHasMore(history.length >= JOIN_HISTORY_LIMIT)
      setTypingUser(null)
    })

    socket.on('chat:message', (msg) => {
      if (!sameConversation(msg.conversationId, conversationIdRef.current)) return
      setMessages((prev) => appendMessage(prev, msg))
      setTypingUser(null)
    })

    socket.on('chat:presence', (data) => {
      if (
        data.conversationId != null &&
        !sameConversation(data.conversationId, conversationIdRef.current)
      ) {
        return
      }
      setOnline(data.online || [])
    })

    socket.on('chat:typing', (data) => {
      if (
        data.conversationId != null &&
        !sameConversation(data.conversationId, conversationIdRef.current)
      ) {
        return
      }
      if (data.isTyping) {
        setTypingUser(data.fullName || 'Someone')
      } else {
        setTypingUser((prev) => (prev === (data.fullName || 'Someone') ? null : prev))
      }
    })

    socket.on('chat:conversations_updated', (payload) => {
      onUpdatedRef.current?.(payload)
    })

    socket.on('chat:error', (err) => {
      setError(err.message || 'Chat error')
    })

    return () => {
      const activeId = conversationIdRef.current
      if (activeId != null) {
        socket.emit('chat:leave', { proposalId, conversationId: Number(activeId) })
      } else {
        socket.emit('chat:leave', { proposalId })
      }
      socket.disconnect()
      socketRef.current = null
      previousConversationRef.current = null
    }
  }, [proposalId, token, enabled])

  // Switch conversation room when selection changes
  useEffect(() => {
    if (!enabled || !proposalId || !socketRef.current) return
    if (conversationId == null) return

    const socket = socketRef.current
    const nextId = Number(conversationId)
    const prevId = previousConversationRef.current

    if (prevId != null && prevId !== nextId) {
      socket.emit('chat:leave', { proposalId, conversationId: prevId })
    }

    setMessages([])
    setOnline([])
    setHasMore(false)
    setTypingUser(null)
    setError(null)

    if (socket.connected) {
      socket.emit('chat:join', { proposalId, conversationId: nextId })
    }
    previousConversationRef.current = nextId
  }, [proposalId, conversationId, enabled])

  const loadOlder = useCallback(async () => {
    if (!messages.length || loadingOlder || conversationId == null) return
    setLoadingOlder(true)
    setError(null)
    try {
      const before = messages[0].id
      const data = await proposalsApi.getProposalChatMessages(proposalId, conversationId, {
        limit: OLDER_PAGE_LIMIT,
        before,
      })
      setHasMore(Boolean(data.hasMore))
      if (typeof data.canSend === 'boolean') setCanSend(data.canSend)
      setMessages((prev) => mergeOlderMessages(prev, data.messages))
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Failed to load older messages')
    } finally {
      setLoadingOlder(false)
    }
  }, [messages, proposalId, conversationId, loadingOlder])

  const sendMessage = useCallback(
    (text) => {
      const trimmed = text.trim()
      if (!trimmed || !socketRef.current || !canSend || conversationId == null) return false
      socketRef.current.emit('chat:message', {
        proposalId,
        conversationId: Number(conversationId),
        text: trimmed,
      })
      return true
    },
    [proposalId, conversationId, canSend],
  )

  const setTyping = useCallback(
    (isTyping) => {
      if (conversationId == null) return
      socketRef.current?.emit('chat:typing', {
        proposalId,
        conversationId: Number(conversationId),
        isTyping,
      })
    },
    [proposalId, conversationId],
  )

  return {
    messages,
    online,
    connected,
    hasMore,
    loadingOlder,
    error,
    typingUser,
    proposalTitle,
    canSend,
    joinedConversationId,
    conversationType,
    sendMessage,
    setTyping,
    loadOlder,
  }
}
