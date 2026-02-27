import { PipelineNode, PipelineEdge } from '@/lib/store/pipeline-store'

const STORAGE_KEY = 'pipeline-studio-pipeline'

export interface SerializedPipeline {
  version: 1
  nodes: PipelineNode[]
  edges: PipelineEdge[]
  savedAt: string
}

export function savePipelineToStorage(nodes: PipelineNode[], edges: PipelineEdge[]) {
  const data: SerializedPipeline = {
    version: 1,
    nodes: nodes.map((n) => ({ ...n, data: { ...n.data, execution: undefined } })),
    edges,
    savedAt: new Date().toISOString(),
  }
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
  } catch {
    console.warn('Failed to save pipeline to localStorage')
  }
}

export function loadPipelineFromStorage(): SerializedPipeline | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const data = JSON.parse(raw) as SerializedPipeline
    if (data.version !== 1) return null
    return data
  } catch {
    return null
  }
}

export function exportPipelineToJSON(nodes: PipelineNode[], edges: PipelineEdge[]): string {
  const data: SerializedPipeline = {
    version: 1,
    nodes: nodes.map((n) => ({ ...n, data: { ...n.data, execution: undefined } })),
    edges,
    savedAt: new Date().toISOString(),
  }
  return JSON.stringify(data, null, 2)
}

export function importPipelineFromJSON(json: string): { nodes: PipelineNode[]; edges: PipelineEdge[] } | null {
  try {
    const data = JSON.parse(json)
    if (!data.nodes || !data.edges) return null
    return { nodes: data.nodes, edges: data.edges }
  } catch {
    return null
  }
}

export function clearStoredPipeline() {
  localStorage.removeItem(STORAGE_KEY)
}
