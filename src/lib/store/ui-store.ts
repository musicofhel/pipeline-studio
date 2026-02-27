import { create } from 'zustand'

interface UIState {
  sidebarOpen: boolean
  configPanelOpen: boolean
  executionPanelOpen: boolean
  theme: 'light' | 'dark' | 'system'

  toggleSidebar: () => void
  setSidebarOpen: (open: boolean) => void
  toggleConfigPanel: () => void
  setConfigPanelOpen: (open: boolean) => void
  toggleExecutionPanel: () => void
  setExecutionPanelOpen: (open: boolean) => void
  setTheme: (theme: 'light' | 'dark' | 'system') => void
}

export const useUIStore = create<UIState>()((set) => ({
  sidebarOpen: true,
  configPanelOpen: false,
  executionPanelOpen: false,
  theme: 'dark',

  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  toggleConfigPanel: () => set((s) => ({ configPanelOpen: !s.configPanelOpen })),
  setConfigPanelOpen: (open) => set({ configPanelOpen: open }),
  toggleExecutionPanel: () => set((s) => ({ executionPanelOpen: !s.executionPanelOpen })),
  setExecutionPanelOpen: (open) => set({ executionPanelOpen: open }),
  setTheme: (theme) => set({ theme }),
}))
