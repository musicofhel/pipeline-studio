import { create } from 'zustand'

export type ExecutionMode = 'demo' | 'live' | 'stream'

interface UIState {
  sidebarOpen: boolean
  configPanelOpen: boolean
  executionPanelOpen: boolean
  comparisonPanelOpen: boolean
  batchTestPanelOpen: boolean
  theme: 'light' | 'dark' | 'system'
  executionMode: ExecutionMode

  toggleSidebar: () => void
  setSidebarOpen: (open: boolean) => void
  toggleConfigPanel: () => void
  setConfigPanelOpen: (open: boolean) => void
  toggleExecutionPanel: () => void
  setExecutionPanelOpen: (open: boolean) => void
  toggleComparisonPanel: () => void
  setComparisonPanelOpen: (open: boolean) => void
  toggleBatchTestPanel: () => void
  setBatchTestPanelOpen: (open: boolean) => void
  setTheme: (theme: 'light' | 'dark' | 'system') => void
  setExecutionMode: (mode: ExecutionMode) => void
}

export const useUIStore = create<UIState>()((set) => ({
  sidebarOpen: true,
  configPanelOpen: false,
  executionPanelOpen: false,
  comparisonPanelOpen: false,
  batchTestPanelOpen: false,
  theme: 'dark',
  executionMode: 'demo',

  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  toggleConfigPanel: () => set((s) => ({ configPanelOpen: !s.configPanelOpen })),
  setConfigPanelOpen: (open) => set({ configPanelOpen: open }),
  toggleExecutionPanel: () => set((s) => ({ executionPanelOpen: !s.executionPanelOpen })),
  setExecutionPanelOpen: (open) => set({ executionPanelOpen: open }),
  toggleComparisonPanel: () => set((s) => ({ comparisonPanelOpen: !s.comparisonPanelOpen })),
  setComparisonPanelOpen: (open) => set({ comparisonPanelOpen: open }),
  toggleBatchTestPanel: () => set((s) => ({ batchTestPanelOpen: !s.batchTestPanelOpen })),
  setBatchTestPanelOpen: (open) => set({ batchTestPanelOpen: open }),
  setTheme: (theme) => set({ theme }),
  setExecutionMode: (mode) => set({ executionMode: mode }),
}))
