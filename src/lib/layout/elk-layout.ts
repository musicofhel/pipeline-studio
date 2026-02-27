import ELK, { type ElkNode, type ElkExtendedEdge } from 'elkjs/lib/elk.bundled.js'
import { type Edge } from '@xyflow/react'
import { type PipelineNode, type PipelineEdge } from '@/lib/store/pipeline-store'

const elk = new ELK()

const DEFAULT_NODE_WIDTH = 260
const DEFAULT_NODE_HEIGHT = 120

interface LayoutOptions {
  direction?: 'RIGHT' | 'DOWN'
  spacing?: number
  nodeWidth?: number
  nodeHeight?: number
}

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

  const elkNodes: ElkNode[] = nodes.map((node) => ({
    id: node.id,
    width: nodeWidth,
    height: nodeHeight,
  }))

  const elkEdges: ElkExtendedEdge[] = edges.map((edge) => ({
    id: edge.id,
    sources: [edge.source],
    targets: [edge.target],
  }))

  const graph: ElkNode = {
    id: 'root',
    layoutOptions: {
      'elk.algorithm': 'layered',
      'elk.direction': direction,
      'elk.spacing.nodeNode': String(spacing),
      'elk.layered.spacing.nodeNodeBetweenLayers': String(spacing * 1.5),
      'elk.layered.crossingMinimization.strategy': 'LAYER_SWEEP',
      'elk.layered.nodePlacement.strategy': 'BRANDES_KOEPF',
      'elk.layered.mergeEdges': 'true',
    },
    children: elkNodes,
    edges: elkEdges,
  }

  const layoutedGraph = await elk.layout(graph)

  const layoutedNodes = nodes.map((node) => {
    const elkNode = layoutedGraph.children?.find((n) => n.id === node.id)
    if (!elkNode) return node
    return {
      ...node,
      position: { x: elkNode.x ?? 0, y: elkNode.y ?? 0 },
    }
  })

  return { nodes: layoutedNodes, edges }
}
