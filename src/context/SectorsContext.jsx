import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import * as sectorsApi from '../api/sectors'
import { SECTORS as FALLBACK_SECTORS } from '../constants/sectors'
import { useAuth } from './AuthContext'

const SectorsContext = createContext({
  sectors: FALLBACK_SECTORS,
  loading: false,
  refreshSectors: async () => {},
})

export function SectorsProvider({ children }) {
  const { isAuthenticated } = useAuth()
  const [sectors, setSectors] = useState(FALLBACK_SECTORS)
  const [loading, setLoading] = useState(false)

  const refreshSectors = useCallback(async () => {
    if (!isAuthenticated) {
      setSectors(FALLBACK_SECTORS)
      return
    }
    setLoading(true)
    try {
      const data = await sectorsApi.getSectors()
      if (Array.isArray(data?.sectors) && data.sectors.length > 0) {
        setSectors(data.sectors)
      }
    } catch {
      setSectors(FALLBACK_SECTORS)
    } finally {
      setLoading(false)
    }
  }, [isAuthenticated])

  useEffect(() => {
    refreshSectors()
  }, [refreshSectors])

  const value = useMemo(
    () => ({ sectors, loading, refreshSectors }),
    [sectors, loading, refreshSectors],
  )

  return <SectorsContext.Provider value={value}>{children}</SectorsContext.Provider>
}

export function useSectors() {
  return useContext(SectorsContext)
}
