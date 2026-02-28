import ELK, { type ElkNode, type ElkExtendedEdge } from 'elkjs/lib/elk.bundled.js'
import { type PipelineNode, type PipelineEdge } from '@/lib/store/pipeline-store'

const DEFAULT_NODE_WIDTH = 280
const DEFAULT_NODE_HEIGHT = 220

interface LayoutOptions {
  direction?: 'RIGHT' | 'DOWN'
  spacing?: number
  nodeWidth?: number
  nodeHeight?: number
}

// ---------------------------------------------------------------------------
// Worker management
// ---------------------------------------------------------------------------

let worker: Worker | null = null
let messageId = 0
const pending = new Map<number, { resolve: (value: Array<{ id: string; x: number; y: number }>) => void; reject: (reason: Error) => void }>()

function getWorker(): Worker | null {
  if (typeof window === 'undefined') return null // SSR guard
  if (worker) return worker

  try {
    worker = new Worker(new URL('./elk-worker.ts', import.meta.url))
    worker.onmessage = (event: MessageEvent<{ id: number; nodes?: Array<{ id: string; x: number; y: number }>; error?: string }>) => {
      const { id, nodes, error } = event.data
      const callbacks = pending.get(id)
      if (!callbacks) return
      pending.delete(id)

      if (error) {
        callbacks.reject(new Error(error))
      } else {
        callbacks.resolve(nodes ?? [])
      }
    }
    worker.onerror = (event) => {
      // Reject all pending requests and discard the broken worker
      const err = new Error(event.message ?? 'ELK worker error')
      for (const [, callbacks] of pending) {
        callbacks.reject(err)
      }
      pending.clear()
      worker?.terminate()
      worker = null
    }
    return worker
  } catch {
    // Worker construction failed (e.g. CSP restrictions) — will fall back
    return null
  }
}

function layoutViaWorker(
  elkNodes: Array<{ id: string; width: number; height: number }>,
  elkEdges: Array<{ id: string; sources: string[]; targets: string[] }>,
  options: Record<string, string>,
): Promise<Array<{ id: string; x: number; y: number }>> {
  const w = getWorker()
  if (!w) {
    // Fallback: should not reach here (caller checks), but just in case
    return Promise.reject(new Error('Worker unavailable'))
  }

  const id = ++messageId
  return new Promise((resolve, reject) => {
    pending.set(id, { resolve, reject })
    w.postMessage({ id, nodes: elkNodes, edges: elkEdges, options })
  })
}

// ---------------------------------------------------------------------------
// Synchronous fallback (used during SSR or when Worker is unavailable)
// ---------------------------------------------------------------------------

let elkFallback: InstanceType<typeof ELK> | null = null

async function layoutFallback(
  elkNodes: ElkNode[],
  elkEdges: ElkExtendedEdge[],
  layoutOptions: Record<string, string>,
): Promise<Array<{ id: string; x: number; y: number }>> {
  if (!elkFallback) {
    elkFallback = new ELK()
  }
  const graph: ElkNode = {
    id: 'root',
    layoutOptions,
    children: elkNodes,
    edges: elkEdges,
  }
  const layoutedGraph = await elkFallback.layout(graph)
  return (layoutedGraph.children ?? []).map((child) => ({
    id: child.id,
    x: child.x ?? 0,
    y: child.y ?? 0,
  }))
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export async function getLayoutedElements(
  nodes: PipelineNode[],
  edges: PipelineEdge[],
  options: LayoutOptions = {}
): Promise<{ nodes: PipelineNode[]; edges: PipelineEdge[] }> {
  const {
    direction = 'RIGHT',
    spacing = 80,
    nodeWidth = DEFAULT_NODE_WIDTH,
    nodeHeight = DEFAULT_NODE_HEIGHT,
  } = options

  const elkNodes = nodes.map((node) => ({
    id: node.id,
    width: nodeWidth,
    height: nodeHeight,
  }))

  const elkEdges = edges.map((edge) => ({
    id: edge.id,
    sources: [edge.source],
    targets: [edge.target],
  }))

  const layoutOptions: Record<string, string> = {
    'elk.algorithm': 'layered',
    'elk.direction': direction,
    'elk.spacing.nodeNode': String(spacing),
    'elk.layered.spacing.nodeNodeBetweenLayers': String(spacing * 1.5),
    'elk.layered.crossingMinimization.strategy': 'LAYER_SWEEP',
    'elk.layered.nodePlacement.strategy': 'BRANDES_KOEPF',
    'elk.layered.mergeEdges': 'true',
  }

  let layoutedPositions: Array<{ id: string; x: number; y: number }>

  const w = getWorker()
  if (w) {
    try {
      layoutedPositions = await layoutViaWorker(elkNodes, elkEdges, layoutOptions)
    } catch {
      // Worker failed — fall back to synchronous layout
      layoutedPositions = await layoutFallback(elkNodes, elkEdges as ElkExtendedEdge[], layoutOptions)
    }
  } else {
    layoutedPositions = await layoutFallback(elkNodes, elkEdges as ElkExtendedEdge[], layoutOptions)
  }

  const positionMap = new Map(layoutedPositions.map((n) => [n.id, { x: n.x, y: n.y }]))

  const layoutedNodes = nodes.map((node) => {
    const pos = positionMap.get(node.id)
    if (!pos) return node
    return {
      ...node,
      position: pos,
    }
  })

  return { nodes: layoutedNodes, edges }
}
