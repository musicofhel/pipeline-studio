'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { pipelineClient } from '@/lib/api/pipeline-client'

interface BackendStatus {
  connected: boolean
  version: string | null
  services: Record<string, { status: string; latency_ms?: number }> | null
  lastChecked: number | null
  error: string | null
}

const INITIAL_STATUS: BackendStatus = {
  connected: false,
  version: null,
  services: null,
  lastChecked: null,
  error: null,
}

export function useBackendStatus(pollIntervalMs = 30000): BackendStatus & { refresh: () => void } {
  const [status, setStatus] = useState<BackendStatus>(INITIAL_STATUS)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const checkHealth = useCallback(async () => {
    try {
      const health = await pipelineClient.health()
      setStatus({
        connected: true,
        version: health.version,
        services: health.services,
        lastChecked: Date.now(),
        error: null,
      })
    } catch (err) {
      setStatus((prev) => ({
        ...prev,
        connected: false,
        lastChecked: Date.now(),
        error: err instanceof Error ? err.message : 'Unknown error',
      }))
    }
  }, [])

  useEffect(() => {
    // Initial check
    checkHealth()

    // Set up polling
    intervalRef.current = setInterval(checkHealth, pollIntervalMs)

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [checkHealth, pollIntervalMs])

  return { ...status, refresh: checkHealth }
}
