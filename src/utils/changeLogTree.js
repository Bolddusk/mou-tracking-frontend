/** Ensure changes is always an array (guards legacy object-shaped payloads). */
export function normalizeLogChanges(log) {
  const raw = log?.changes
  if (Array.isArray(raw)) return raw.filter(Boolean)
  if (raw && typeof raw === 'object') return Object.values(raw).filter(Boolean)
  return []
}

function fieldKey(change) {
  return String(change.field || change.label || 'unknown').trim() || 'unknown'
}

function fieldLabel(change) {
  return change.label || change.field || 'Field'
}

/**
 * Group all log entries by field — repeated updates to Progress (etc.) nest under one branch.
 * Revisions within each field are newest-first.
 */
export function buildFieldRevisionTree(logs) {
  const fieldMap = new Map()

  const chronological = [...logs].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
  )

  for (const log of chronological) {
    const changes = normalizeLogChanges(log)
    if (changes.length > 0) {
      for (const change of changes) {
        const key = fieldKey(change)
        if (!fieldMap.has(key)) {
          fieldMap.set(key, { key, label: fieldLabel(change), revisions: [] })
        }
        fieldMap.get(key).revisions.push({
          logId: log.id,
          createdAt: log.created_at,
          changedByName: log.changed_by_name,
          changedByRole: log.changed_by_role,
          actionLabel: log.action_label || log.action,
          summary: log.summary,
          oldValue: change.old_value,
          newValue: change.new_value,
        })
      }
      continue
    }

    const details = Array.isArray(log.change_details) ? log.change_details.filter(Boolean) : []
    if (details.length > 0) {
      const key = `__details_${log.id}`
      fieldMap.set(key, {
        key,
        label: log.summary || log.action_label || 'Change details',
        revisions: [
          {
            logId: log.id,
            createdAt: log.created_at,
            changedByName: log.changed_by_name,
            changedByRole: log.changed_by_role,
            actionLabel: log.action_label || log.action,
            summary: log.summary,
            details,
          },
        ],
      })
    }
  }

  return Array.from(fieldMap.values())
    .map((group) => ({
      ...group,
      revisions: [...group.revisions].reverse(),
      lastUpdatedAt: group.revisions[group.revisions.length - 1]?.createdAt,
    }))
    .sort(
      (a, b) => new Date(b.lastUpdatedAt).getTime() - new Date(a.lastUpdatedAt).getTime(),
    )
}

export function countFieldRevisions(groups) {
  return groups.reduce((sum, group) => sum + group.revisions.length, 0)
}
