import type { PipelineTrace, TraceSpan } from '@/types/pipeline'
import type { PipelineNode } from '@/lib/store/pipeline-store'
import type { NodeStatus } from '@/types/nodes'
import { NODE_REGISTRY } from '@/lib/nodes/registry'

/**
 * Trace Mapper — maps backend pipeline stages to canvas nodes.
 *
 * The backend has 12 stages but the canvas has 17 nodes.
 * This module bridges the gap by splitting stage spans across
 * the finer-grained canvas nodes with proportional latency.
 */

/** Mapping from a backend stage name to the canvas node type(s) it covers. */
export const STAGE_TO_NODES: Record<string, string[]> = {
  input:         ['query_input'],
  safety:        ['injection_filter', 'pii_detector', 'lakera_guard', 'safety_gate'],
  routing:       ['semantic_router'],
  expansion:     ['query_expander'],
  retrieval:     ['qdrant_retrieval', 'deduplication', 'cohere_rerank'],
  compression:   ['bm25_compression'],
  generation:    ['model_router', 'llm_generation'],
  quality:       ['hhem_checker', 'output_schema'],
  observability: ['langfuse_tracing', 'prometheus_metrics'],
  output:        ['response_output'],
}

/** Reverse lookup: canvas node type -> backend stage name. */
export const NODE_TO_STAGE: Record<string, string> = Object.fromEntries(
  Object.entries(STAGE_TO_NODES).flatMap(([stage, nodeTypes]) =>
    nodeTypes.map((nt) => [nt, stage])
  )
)

/** Result of mapping a trace span onto a single canvas node. */
export interface NodeTraceMapping {
  /** Canvas node ID (from the React Flow graph). */
  nodeId: string
  /** Canvas node type (e.g. 'injection_filter'). */
  nodeType: string
  /** Backend stage name this node belongs to (e.g. 'safety'). */
  stage: string
  /** Execution status derived from the span. */
  status: NodeStatus
  /** Allocated latency in ms (proportional split within the stage). */
  latencyMs: number
  /** Estimated cost allocated to this node. */
  cost: number
  /** Input data from the span (if any). */
  inputData?: Record<string, unknown>
  /** Output data from the span (if any). */
  outputData?: Record<string, unknown>
  /** Error message if the span failed. */
  error?: string
  /** Skip reason if the node was not executed. */
  skipReason?: string
}

/**
 * Maps backend trace spans onto canvas node IDs with split latency.
 *
 * For each span in the trace, looks up which canvas nodes correspond to
 * that stage, then distributes the span's duration across those nodes
 * proportionally based on each node's estimatedLatencyMs from NODE_REGISTRY.
 *
 * Nodes present on the canvas that don't appear in any span are marked
 * as 'skipped' with the route as the skip reason.
 */
export function mapTraceToNodes(
  trace: PipelineTrace,
  nodes: PipelineNode[]
): NodeTraceMapping[] {
  const mappings: NodeTraceMapping[] = []
  const mappedNodeIds = new Set<string>()

  // Build a lookup of spans by stage name
  const spanByStage = new Map<string, TraceSpan>()
  for (const span of trace.spans) {
    spanByStage.set(span.name, span)
  }

  // For each backend stage that has a trace span, distribute across canvas nodes
  for (const [stageName, nodeTypes] of Object.entries(STAGE_TO_NODES)) {
    const span = spanByStage.get(stageName)
    if (!span) continue

    // Find canvas nodes that match these types
    const canvasNodes = nodes.filter((n) => n.type && nodeTypes.includes(n.type))
    if (canvasNodes.length === 0) continue

    // Calculate proportional latency split based on estimatedLatencyMs
    const estimates = canvasNodes.map((n) => {
      const def = n.type ? NODE_REGISTRY[n.type] : null
      return def?.estimatedLatencyMs ?? 10
    })
    const totalEstimate = estimates.reduce((sum, e) => sum + e, 0)

    for (let i = 0; i < canvasNodes.length; i++) {
      const node = canvasNodes[i]
      if (!node.type) continue

      const proportion = totalEstimate > 0 ? estimates[i] / totalEstimate : 1 / canvasNodes.length
      const allocatedLatency = Math.round(span.duration_ms * proportion * 100) / 100

      const def = node.type ? NODE_REGISTRY[node.type] : null
      const estimatedCost = def?.estimatedCostPerCall ?? 0

      mappings.push({
        nodeId: node.id,
        nodeType: node.type,
        stage: stageName,
        status: span.status === 'success' ? 'success' : 'error',
        latencyMs: allocatedLatency,
        cost: estimatedCost,
        inputData: span.input,
        outputData: span.output,
        error: span.status === 'error' ? `Stage "${stageName}" failed` : undefined,
      })

      mappedNodeIds.add(node.id)
    }
  }

  // Mark unmapped nodes as skipped
  for (const node of nodes) {
    if (mappedNodeIds.has(node.id)) continue
    if (!node.type) continue

    const stage = NODE_TO_STAGE[node.type]
    mappings.push({
      nodeId: node.id,
      nodeType: node.type,
      stage: stage ?? 'unknown',
      status: 'skipped',
      latencyMs: 0,
      cost: 0,
      skipReason: `Route: ${trace.route}`,
    })
  }

  return mappings
}

/**
 * Determines which canvas node types are reachable for a given route.
 *
 * In the enterprise-pipeline backend:
 * - 'rag_knowledge_base' runs the full pipeline (all nodes)
 * - 'direct_llm' skips retrieval/compression/expansion
 * - 'chitchat' skips retrieval/compression/expansion/quality
 * - 'code_generation' same as rag but may skip reranking
 * - 'out_of_scope' stops after routing (no generation)
 *
 * This is used by executeDemo() to skip nodes not on the selected route.
 */
export function getActiveNodeTypesForRoute(route: string): Set<string> {
  // All nodes that always execute (input, safety, routing, observability, output)
  const alwaysActive = [
    'query_input',
    'injection_filter',
    'pii_detector',
    'lakera_guard',
    'safety_gate',
    'semantic_router',
    'langfuse_tracing',
    'prometheus_metrics',
    'response_output',
  ]

  switch (route) {
    case 'rag_knowledge_base':
      return new Set([
        ...alwaysActive,
        'query_expander',
        'qdrant_retrieval',
        'deduplication',
        'cohere_rerank',
        'bm25_compression',
        'model_router',
        'llm_generation',
        'hhem_checker',
        'output_schema',
      ])

    case 'direct_llm':
      return new Set([
        ...alwaysActive,
        'model_router',
        'llm_generation',
        'hhem_checker',
        'output_schema',
      ])

    case 'chitchat':
      return new Set([
        ...alwaysActive,
        'model_router',
        'llm_generation',
        'output_schema',
      ])

    case 'code_generation':
      return new Set([
        ...alwaysActive,
        'query_expander',
        'qdrant_retrieval',
        'deduplication',
        'bm25_compression',
        'model_router',
        'llm_generation',
        'hhem_checker',
        'output_schema',
      ])

    case 'out_of_scope':
      // Stops after routing -- response_output still runs to deliver the "out of scope" message
      return new Set([
        ...alwaysActive,
        'output_schema',
      ])

    default:
      // Unknown route -- assume full pipeline
      return new Set([
        ...alwaysActive,
        'query_expander',
        'qdrant_retrieval',
        'deduplication',
        'cohere_rerank',
        'bm25_compression',
        'model_router',
        'llm_generation',
        'hhem_checker',
        'output_schema',
      ])
  }
}
