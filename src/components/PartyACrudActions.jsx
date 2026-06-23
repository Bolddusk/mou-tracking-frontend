import { ActionGroup, DeleteIcon, EditIcon, IconButton, ViewIcon } from './ActionIcons'

const CAN_EDIT = new Set(['draft', 'rejected'])
const CAN_DELETE = new Set(['draft', 'rejected'])

export default function PartyACrudActions({ proposal, onView, onUpdate, onDelete }) {
  const status = (proposal.status || '').toLowerCase()
  const canEdit = CAN_EDIT.has(status)
  const canDelete = CAN_DELETE.has(status)

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
      <IconButton
        variant="delete"
        title={
          canDelete
            ? 'Delete — remove opportunity'
            : 'Delete disabled — submitted/approved cannot be deleted'
        }
        disabled={!canDelete}
        onClick={() => canDelete && onDelete(proposal)}
      >
        <DeleteIcon />
      </IconButton>
    </ActionGroup>
  )
}
