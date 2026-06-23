import client from './client'

export async function reassignSectorLead({ sector, new_sl_user_id, reason }) {
  const response = await client.patch('/api/admin/sector-lead/reassign', {
    sector,
    new_sl_user_id,
    reason: reason?.trim() || undefined,
  })
  return response.data
}

export async function getSectorLeadReassignments() {
  const response = await client.get('/api/admin/sector-lead/reassignments')
  return response.data
}

export async function getSectorLeadOrphans() {
  const response = await client.get('/api/admin/sector-lead/orphans')
  return response.data
}
