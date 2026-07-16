import { ActionGroup, DeleteIcon, EditIcon, IconButton, ViewIcon } from './ActionIcons'

const CAN_EDIT = new Set(['draft', 'rejected'])

export default function PartyACrudActions({ proposal, onView, onUpdate, onDelete }) {
  const status = (proposal.status || '').toLowerCase()
  const canEdit = CAN_EDIT.has(status)
  const canDelete =
    proposal?.capabilities?.can_delete === true ||
    (proposal?.capabilities?.can_delete == null && CAN_EDIT.has(status))

  return (
    <ActionGroup>
      <IconButton variant="view" title="Read — view details" onClick={() => onView(proposal)}>
        <ViewIcon />
      </IconButton>
      <IconButton
        variant="edit"
        title={
          canEdit
            ? status === 'rejected'
              ? 'Update — edit and resubmit'
              : 'Update — edit draft'
            : 'Update disabled — only drafts and rejected proposals can be edited'
        }
        disabled={!canEdit}
        onClick={() => canEdit && onUpdate(proposal)}
      >
        <EditIcon />
      </IconButton>
      {canDelete && (
        <IconButton
          variant="delete"
          title="Delete — remove draft or rejected opportunity"
          onClick={() => onDelete(proposal)}
        >
          <DeleteIcon />
        </IconButton>
      )}
    </ActionGroup>
  )
}
