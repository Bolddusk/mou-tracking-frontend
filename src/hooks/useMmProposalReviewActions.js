import { useState } from 'react'
import * as mmApi from '../api/matchmaking'
import * as usersApi from '../api/users'
import { getErrorMessage } from '../utils/format'

export function useMmProposalReviewActions({ onReload, onStatusFilterChange } = {}) {
  const [success, setSuccess] = useState('')
  const [reviewError, setReviewError] = useState('')
  const [actionTarget, setActionTarget] = useState(null)
  const [actionType, setActionType] = useState(null)
  const [comment, setComment] = useState('')
  const [actionLoading, setActionLoading] = useState(false)
  const [forwardTargets, setForwardTargets] = useState([])
  const [forwardToUserId, setForwardToUserId] = useState('')
  const [loadingForwardTargets, setLoadingForwardTargets] = useState(false)

  const closeModal = () => {
    setActionTarget(null)
    setActionType(null)
    setComment('')
    setForwardTargets([])
    setForwardToUserId('')
  }

  const openShortlist = (proposal) => {
    setActionTarget(proposal)
    setActionType('shortlist')
    setComment('')
  }

  const openReject = (proposal) => {
    setActionTarget(proposal)
    setActionType('reject')
    setComment('')
  }

  const openForwardModal = async (proposal) => {
    setActionTarget(proposal)
    setActionType('forward')
    setComment('')
    setForwardToUserId('')
    setLoadingForwardTargets(true)
    try {
      let leads = await usersApi.getSectorLeads(proposal.sector)
      if (!leads.length) {
        leads = await usersApi.getSectorLeads()
      }
      setForwardTargets(leads)
      if (leads.length === 1) {
        setForwardToUserId(String(leads[0].id))
      }
    } catch {
      setForwardTargets([])
    } finally {
      setLoadingForwardTargets(false)
    }
  }

  const handleConfirm = async () => {
    if (!actionTarget) return
    if (actionType === 'reject' && !comment.trim()) {
      setReviewError('Rejection comment is required')
      return
    }
    setActionLoading(true)
    setReviewError('')
    setSuccess('')
    try {
      if (actionType === 'shortlist') {
        const res = await mmApi.shortlistMmProposal(actionTarget.id, comment)
        setSuccess(res.message || 'Proposal shortlisted')
        onStatusFilterChange?.('shortlisted')
      } else if (actionType === 'reject') {
        const res = await mmApi.rejectMmProposal(actionTarget.id, comment)
        setSuccess(res.message || 'Proposal rejected')
        onStatusFilterChange?.('rejected')
      } else if (actionType === 'forward') {
        if (!forwardToUserId) {
          setReviewError('Select a sector lead to forward to')
          setActionLoading(false)
          return
        }
        const res = await mmApi.forwardMmProposal(actionTarget.id, {
          forward_to_user_id: Number(forwardToUserId),
        })
        setSuccess(res.message || 'Proposal forwarded')
        onStatusFilterChange?.('forwarded')
      }
      closeModal()
      await onReload?.()
    } catch (err) {
      setReviewError(getErrorMessage(err))
    } finally {
      setActionLoading(false)
    }
  }

  return {
    success,
    setSuccess,
    reviewError,
    setReviewError,
    actionTarget,
    actionType,
    comment,
    setComment,
    actionLoading,
    forwardTargets,
    forwardToUserId,
    setForwardToUserId,
    loadingForwardTargets,
    closeModal,
    openShortlist,
    openReject,
    openForwardModal,
    handleConfirm,
  }
}
