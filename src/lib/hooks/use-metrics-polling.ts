'use client'

import { useEffect, useRef, useCallback } from 'react'
import { pipelineClient } from '@/lib/api/pipeline-client'
import { useMetricsStore } from '@/lib/store/metrics-store'

/**
 * Parse Prometheus text exposition format into a flat Record<string, number>.
 *
 * Lines look like:
 *   # HELP metric_name description
 *   # TYPE metric_name counter
 *   metric_name{label="value"} 123.45
 *   metric_name 42
 *
 * We skip comment / blank lines and extract the metric name (with labels) and numeric value.
 */
function parsePrometheusText(text: string): Record<string, number> {
  const metrics: Record<string, number> = {}

  for (const line of text.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue

    // Match: metric_name{labels} value  OR  metric_name value
    const match = trimmed.match(/^([a-zA-Z_:][a-zA-Z0-9_:]*(?:\{[^}]*\})?)[\t ]+([0-9eE.+\-]+)/)
    if (match) {
      const name = match[1]
      const value = parseFloat(match[2])
      if (!isNaN(value)) {
        metrics[name] = value
      }
    }
  }

  return metrics
}

/**
 * Hook that polls /api/pipeline/metrics at a configurable interval.
 * Parses Prometheus text format and stores results in the metrics Zustand store.
 *
 * Starts polling on mount, stops on unmount.
 */
export function useMetricsPolling(intervalMs = 15000) {
  const setMetrics = useMetricsStore((s) => s.setMetrics)
  const startPolling = useMetricsStore((s) => s.startPolling)
  const stopPolling = useMetricsStore((s) => s.stopPolling)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const fetchMetrics = useCallback(async () => {
    try {
      const text = await pipelineClient.metrics()
      const parsed = parsePrometheusText(text)
      setMetrics(parsed)
    } catch {
      // Silently ignore fetch errors — metrics are optional / best-effort
    }
  }, [setMetrics])

  useEffect(() => {
    startPolling()
    fetchMetrics()

    intervalRef.current = setInterval(fetchMetrics, intervalMs)

    return () => {
      stopPolling()
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [fetchMetrics, intervalMs, startPolling, stopPolling])
}
