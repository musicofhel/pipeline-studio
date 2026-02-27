import { create } from 'zustand'
import { usePipelineStore, type PipelineNode, type PipelineEdge } from './pipeline-store'

export interface PipelinePreset {
  id: string
  name: string
  description: string
  createdAt: number
  updatedAt: number
  nodes: PipelineNode[]
  edges: PipelineEdge[]
}

const STORAGE_KEY = 'pipeline-studio-presets'

function loadPresetsFromStorage(): PipelinePreset[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    return JSON.parse(raw) as PipelinePreset[]
  } catch {
    return []
  }
}

function savePresetsToStorage(presets: PipelinePreset[]) {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(presets))
  } catch (err) {
    console.error('Failed to save presets to localStorage:', err)
  }
}

interface PresetsState {
  presets: PipelinePreset[]

  savePreset: (name: string, description: string) => void
  loadPreset: (id: string) => void
  deletePreset: (id: string) => void
  renamePreset: (id: string, name: string) => void
  exportPreset: (id: string) => string
  importPreset: (json: string) => void
}

export const usePresetsStore = create<PresetsState>()((set, get) => ({
  presets: loadPresetsFromStorage(),

  savePreset: (name, description) => {
    const { nodes, edges } = usePipelineStore.getState().exportPipeline()
    const now = Date.now()
    const preset: PipelinePreset = {
      id: `preset-${now}`,
      name,
      description,
      createdAt: now,
      updatedAt: now,
      nodes,
      edges,
    }
    const updated = [preset, ...get().presets]
    set({ presets: updated })
    savePresetsToStorage(updated)
  },

  loadPreset: (id) => {
    const preset = get().presets.find((p) => p.id === id)
    if (!preset) return
    usePipelineStore.getState().loadPipeline({
      nodes: preset.nodes,
      edges: preset.edges,
    })
  },

  deletePreset: (id) => {
    const updated = get().presets.filter((p) => p.id !== id)
    set({ presets: updated })
    savePresetsToStorage(updated)
  },

  renamePreset: (id, name) => {
    const updated = get().presets.map((p) =>
      p.id === id ? { ...p, name, updatedAt: Date.now() } : p
    )
    set({ presets: updated })
    savePresetsToStorage(updated)
  },

  exportPreset: (id) => {
    const preset = get().presets.find((p) => p.id === id)
    if (!preset) return '{}'
    return JSON.stringify(preset, null, 2)
  },

  importPreset: (json) => {
    try {
      const parsed = JSON.parse(json) as PipelinePreset
      if (!parsed.name || !parsed.nodes || !parsed.edges) {
        console.error('Invalid preset format')
        return
      }
      // Generate a new ID to avoid collisions
      const now = Date.now()
      const preset: PipelinePreset = {
        ...parsed,
        id: `preset-${now}`,
        updatedAt: now,
      }
      const updated = [preset, ...get().presets]
      set({ presets: updated })
      savePresetsToStorage(updated)
    } catch (err) {
      console.error('Failed to import preset:', err)
    }
  },
}))
