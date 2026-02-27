import { create } from 'zustand'

interface MetricsState {
  metrics: Record<string, number>
  lastFetched: number | null
  isPolling: boolean

  setMetrics: (metrics: Record<string, number>) => void
  setLastFetched: (ts: number) => void
  startPolling: () => void
  stopPolling: () => void
}

export const useMetricsStore = create<MetricsState>()((set) => ({
  metrics: {},
  lastFetched: null,
  isPolling: false,

  setMetrics: (metrics) => set({ metrics, lastFetched: Date.now() }),
  setLastFetched: (ts) => set({ lastFetched: ts }),
  startPolling: () => set({ isPolling: true }),
  stopPolling: () => set({ isPolling: false }),
}))
