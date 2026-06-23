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

export function useProposalChat(proposalId, token, enabled = true) {
  const socketRef = useRef(null)
  const [messages, setMessages] = useState([])
  const [online, setOnline] = useState([])
  const [connected, setConnected] = useState(false)
  const [hasMore, setHasMore] = useState(false)
  const [loadingOlder, setLoadingOlder] = useState(false)
  const [error, setError] = useState(null)
  const [typingUser, setTypingUser] = useState(null)
  const [proposalTitle, setProposalTitle] = useState('')
  const [canSend, setCanSend] = useState(true)

  useEffect(() => {
    if (!enabled || !proposalId || !token) return undefined

    setError(null)
    setMessages([])
    setOnline([])
    setHasMore(false)
    setTypingUser(null)
    setCanSend(true)

    const socket = io(SOCKET_URL, {
      auth: { token },
      transports: ['websocket', 'polling'],
    })
    socketRef.current = socket

    socket.on('connect', () => {
      setConnected(true)
      setError(null)
      socket.emit('chat:join', { proposalId })
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
      const history = data.messages || []
      setMessages(history)
      setHasMore(history.length >= JOIN_HISTORY_LIMIT)
    })

    socket.on('chat:message', (msg) => {
      setMessages((prev) => appendMessage(prev, msg))
      setTypingUser(null)
    })

    socket.on('chat:presence', (data) => {
      setOnline(data.online || [])
    })

    socket.on('chat:typing', (data) => {
      if (data.isTyping) {
        setTypingUser(data.fullName || 'Someone')
      } else {
        setTypingUser((prev) => (prev === (data.fullName || 'Someone') ? null : prev))
      }
    })

    socket.on('chat:error', (err) => {
      setError(err.message || 'Chat error')
    })

    return () => {
      socket.emit('chat:leave', { proposalId })
      socket.disconnect()
      socketRef.current = null
    }
  }, [proposalId, token, enabled])

  const loadOlder = useCallback(async () => {
    if (!messages.length || loadingOlder) return
    setLoadingOlder(true)
    setError(null)
    try {
      const before = messages[0].id
      const data = await proposalsApi.getProposalMessages(proposalId, {
        limit: OLDER_PAGE_LIMIT,
        before,
      })
      setHasMore(Boolean(data.hasMore))
      setMessages((prev) => mergeOlderMessages(prev, data.messages))
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Failed to load older messages')
    } finally {
      setLoadingOlder(false)
    }
  }, [messages, proposalId, loadingOlder])

  const sendMessage = useCallback(
    (text) => {
      const trimmed = text.trim()
      if (!trimmed || !socketRef.current || !canSend) return false
      socketRef.current.emit('chat:message', { proposalId, text: trimmed })
      return true
    },
    [proposalId, canSend],
  )

  const setTyping = useCallback(
    (isTyping) => {
      socketRef.current?.emit('chat:typing', { proposalId, isTyping })
    },
    [proposalId],
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
    sendMessage,
    setTyping,
    loadOlder,
  }
}
