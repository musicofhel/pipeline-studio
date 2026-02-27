import { create } from 'zustand'

export type ExecutionMode = 'demo' | 'live' | 'stream'

interface UIState {
  sidebarOpen: boolean
  configPanelOpen: boolean
  executionPanelOpen: boolean
  theme: 'light' | 'dark' | 'system'
  executionMode: ExecutionMode

  toggleSidebar: () => void
  setSidebarOpen: (open: boolean) => void
  toggleConfigPanel: () => void
  setConfigPanelOpen: (open: boolean) => void
  toggleExecutionPanel: () => void
  setExecutionPanelOpen: (open: boolean) => void
  setTheme: (theme: 'light' | 'dark' | 'system') => void
  setExecutionMode: (mode: ExecutionMode) => void
}

export const useUIStore = create<UIState>()((set) => ({
  sidebarOpen: true,
  configPanelOpen: false,
  executionPanelOpen: false,
  theme: 'dark',
  executionMode: 'demo',

  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  toggleConfigPanel: () => set((s) => ({ configPanelOpen: !s.configPanelOpen })),
  setConfigPanelOpen: (open) => set({ configPanelOpen: open }),
  toggleExecutionPanel: () => set((s) => ({ executionPanelOpen: !s.executionPanelOpen })),
  setExecutionPanelOpen: (open) => set({ executionPanelOpen: open }),
  setTheme: (theme) => set({ theme }),
  setExecutionMode: (mode) => set({ executionMode: mode }),
}))
