import { Link, useParams } from 'react-router-dom'
import ComplianceFilingsPanel from '../../components/compliance/ComplianceFilingsPanel'

export default function ComplianceFilingDetail() {
  const { userId } = useParams()

  return (
    <div className="space-y-6">
      <Link
        to="/dashboard/super-admin/compliance"
        className="text-sm font-medium text-green-700 hover:underline"
      >
        ← Compliance filings
      </Link>
      <ComplianceFilingsPanel mode="admin" userId={Number(userId)} />
    </div>
  )
}
