import { type Connection } from '@xyflow/react'
import { NODE_REGISTRY } from '@/lib/nodes/registry'
import { HandleType } from '@/types/nodes'
import { PipelineNode } from '@/lib/store/pipeline-store'

/**
 * Validates that a connection between two handles is type-compatible.
 * Only matching HandleTypes can connect (query→query, documents→documents, etc.)
 */
export function isValidConnection(
  connection: Connection,
  nodes: PipelineNode[]
): boolean {
  const sourceNode = nodes.find((n) => n.id === connection.source)
  const targetNode = nodes.find((n) => n.id === connection.target)

  if (!sourceNode || !targetNode) return false
  if (!sourceNode.type || !targetNode.type) return false

  const sourceDef = NODE_REGISTRY[sourceNode.type]
  const targetDef = NODE_REGISTRY[targetNode.type]

  if (!sourceDef || !targetDef) return false

  const sourceHandle = sourceDef.outputs.find((h) => h.id === connection.sourceHandle)
  const targetHandle = targetDef.inputs.find((h) => h.id === connection.targetHandle)

  if (!sourceHandle || !targetHandle) return false

  return sourceHandle.type === targetHandle.type
}

/**
 * Get the HandleType for a specific handle on a node.
 */
export function getHandleType(
  nodeType: string,
  handleId: string,
  direction: 'input' | 'output'
): HandleType | null {
  const def = NODE_REGISTRY[nodeType]
  if (!def) return null

  const handles = direction === 'input' ? def.inputs : def.outputs
  const handle = handles.find((h) => h.id === handleId)
  return handle?.type ?? null
}

/**
 * Topological sort of nodes based on edges.
 * Returns an array of depth levels, where each level contains node IDs
 * that can be executed in parallel.
 */
export function topologicalSort(
  nodeIds: string[],
  edges: { source: string; target: string }[]
): string[][] {
  const inDegree = new Map<string, number>()
  const adjacency = new Map<string, string[]>()

  for (const id of nodeIds) {
    inDegree.set(id, 0)
    adjacency.set(id, [])
  }

  for (const edge of edges) {
    if (inDegree.has(edge.source) && inDegree.has(edge.target)) {
      adjacency.get(edge.source)!.push(edge.target)
      inDegree.set(edge.target, (inDegree.get(edge.target) ?? 0) + 1)
    }
  }

  const levels: string[][] = []
  let queue = nodeIds.filter((id) => inDegree.get(id) === 0)

  while (queue.length > 0) {
    levels.push([...queue])
    const nextQueue: string[] = []
    for (const id of queue) {
      for (const neighbor of adjacency.get(id) ?? []) {
        const newDegree = (inDegree.get(neighbor) ?? 1) - 1
        inDegree.set(neighbor, newDegree)
        if (newDegree === 0) {
          nextQueue.push(neighbor)
        }
      }
    }
    queue = nextQueue
  }

  return levels
}
