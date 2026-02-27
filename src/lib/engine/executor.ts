import { usePipelineStore, type PipelineNode, type PipelineEdge } from '@/lib/store/pipeline-store'
import { topologicalSort } from './validator'
import { pipelineClient } from '@/lib/api/pipeline-client'
import { NODE_REGISTRY } from '@/lib/nodes/registry'
import {
  mapTraceToNodes,
  getActiveNodeTypesForRoute,
  STAGE_TO_NODES,
} from './trace-mapper'
import type { PipelineTrace } from '@/types/pipeline'
import type { ExecutionMode } from '@/lib/store/ui-store'

/** SSE event shape from the /api/pipeline/stream endpoint. */
interface StreamEvent {
  stage: string
  status: 'running' | 'completed' | 'error'
  progress: number
  error?: string
  metadata?: Record<string, unknown>
  result?: {
    answer: string
    trace_id: string
    sources: unknown[]
    metadata: {
      route: string
      latency_ms: number
      cost_usd: number
      stages_completed: string[]
      safety_passed: boolean
    }
  }
}

/** Demo routes and their relative probability for random selection. */
const DEMO_ROUTES = [
  { route: 'rag_knowledge_base', weight: 0.50 },
  { route: 'direct_llm',        weight: 0.20 },
  { route: 'chitchat',          weight: 0.15 },
  { route: 'code_generation',   weight: 0.10 },
  { route: 'out_of_scope',      weight: 0.05 },
] as const

/**
 * Pipeline Executor — Phase 3
 *
 * Three execution modes:
 * - demo:   Simulates trace replay with realistic latencies from NODE_REGISTRY,
 *           respects route-based node skipping.
 * - live:   Sends query to the backend, receives full response, then replays
 *           trace onto canvas using the trace mapper.
 * - stream: Connects to the SSE BFF endpoint and updates nodes in real-time
 *           as stage progress events arrive.
 */
export class PipelineExecutor {
  private abortController: AbortController | null = null

  async execute(query: string, userId: string, tenantId: string, mode: ExecutionMode = 'demo') {
    const store = usePipelineStore.getState()
    const runId = store.startExecution(query)

    this.abortController = new AbortController()

    try {
      switch (mode) {
        case 'live':
          await this.executeLive(runId, query, userId, tenantId)
          break
        case 'stream':
          await this.executeStream(runId, query, userId, tenantId)
          break
        case 'demo':
        default:
          await this.executeDemo(runId)
          break
      }
    } catch (error) {
      if (this.abortController?.signal.aborted) {
        usePipelineStore.getState().setExecutionStatus('aborted')
      } else {
        usePipelineStore.getState().setExecutionStatus('error')
        console.error('Execution failed:', error)
      }
    }
  }

  abort() {
    this.abortController?.abort()
    usePipelineStore.getState().setExecutionStatus('aborted')
  }

  // ---------------------------------------------------------------------------
  // Live mode — single request/response with trace replay
  // ---------------------------------------------------------------------------

  private async executeLive(runId: string, query: string, userId: string, tenantId: string) {
    const store = usePipelineStore.getState()
    const { nodes } = store

    // Set all nodes to running initially
    for (const node of nodes) {
      store.setNodeStatus(node.id, 'running')
    }

    const response = await pipelineClient.query({
      query,
      user_id: userId,
      tenant_id: tenantId,
    })

    // If the response includes trace data, use the trace mapper
    const traceData = (response as unknown as Record<string, unknown>).trace as PipelineTrace | undefined

    if (traceData?.spans?.length) {
      const currentNodes = usePipelineStore.getState().nodes
      const mappings = mapTraceToNodes(traceData, currentNodes)

      for (const mapping of mappings) {
        usePipelineStore.getState().setNodeStatus(mapping.nodeId, mapping.status, {
          latencyMs: mapping.latencyMs,
          cost: mapping.cost,
          inputData: mapping.inputData,
          outputData: mapping.outputData,
          error: mapping.error,
          skipReason: mapping.skipReason,
        })
      }
    } else {
      // Fallback: use metadata.stages_completed with improved mapping
      this.replayFromMetadata(nodes, response.metadata)
    }

    usePipelineStore.getState().completeExecution(runId, {
      totalLatencyMs: response.metadata.latency_ms,
      totalCost: response.metadata.cost_usd,
      route: response.metadata.route,
      response: response.answer,
    })
  }

  // ---------------------------------------------------------------------------
  // Stream mode — SSE real-time updates
  // ---------------------------------------------------------------------------

  private async executeStream(runId: string, query: string, userId: string, tenantId: string) {
    const store = usePipelineStore.getState()
    const { nodes, edges } = store

    // Set all nodes to idle (they'll transition to running as stages start)
    for (const node of nodes) {
      store.setNodeStatus(node.id, 'idle')
    }

    const response = await fetch('/api/pipeline/stream', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query,
        user_id: userId,
        tenant_id: tenantId,
      }),
      signal: this.abortController?.signal,
    })

    if (!response.ok || !response.body) {
      throw new Error(`Stream request failed: ${response.status}`)
    }

    const reader = response.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''

    try {
      while (true) {
        if (this.abortController?.signal.aborted) return

        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })

        // Parse SSE events from the buffer
        const lines = buffer.split('\n')
        buffer = lines.pop() ?? '' // Keep incomplete last line in buffer

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          const jsonStr = line.slice(6).trim()
          if (!jsonStr) continue

          try {
            const event: StreamEvent = JSON.parse(jsonStr)
            this.handleStreamEvent(event, nodes, edges)
          } catch {
            // Skip malformed events
            console.warn('Malformed SSE event:', jsonStr)
          }
        }
      }
    } finally {
      reader.releaseLock()
    }

    // Finalize
    const currentStore = usePipelineStore.getState()
    if (currentStore.executionStatus === 'running') {
      // If we didn't get a _complete event, mark as completed anyway
      currentStore.completeExecution(runId, {
        totalLatencyMs: 0,
        totalCost: 0,
        route: 'unknown',
        response: 'Stream completed without final result.',
      })
    }
  }

  /**
   * Handles a single SSE event during stream execution.
   * Maps the backend stage to canvas nodes and updates their status.
   */
  private handleStreamEvent(event: StreamEvent, nodes: PipelineNode[], edges: PipelineEdge[]) {
    const store = usePipelineStore.getState()

    if (event.stage === '_start') {
      // Mark all nodes as idle
      for (const node of nodes) {
        store.setNodeStatus(node.id, 'idle')
      }
      return
    }

    if (event.stage === '_error') {
      store.setExecutionStatus('error')
      return
    }

    if (event.stage === '_complete' && event.result) {
      const currentRunId = store.currentRunId
      if (currentRunId) {
        store.completeExecution(currentRunId, {
          totalLatencyMs: event.result.metadata.latency_ms,
          totalCost: event.result.metadata.cost_usd,
          route: event.result.metadata.route,
          response: event.result.answer,
        })
      }
      return
    }

    // Regular stage event — map to canvas nodes
    const nodeTypes = STAGE_TO_NODES[event.stage]
    if (!nodeTypes) return

    const canvasNodes = nodes.filter((n) => n.type && nodeTypes.includes(n.type))

    for (const node of canvasNodes) {
      if (event.status === 'running') {
        store.setNodeStatus(node.id, 'running')
      } else if (event.status === 'completed') {
        const def = node.type ? NODE_REGISTRY[node.type] : null
        store.setNodeStatus(node.id, 'success', {
          cost: def?.estimatedCostPerCall ?? 0,
        })

        // Animate outgoing edges
        const outgoingIds = edges
          .filter((e) => e.source === node.id)
          .map((e) => e.id)
        if (outgoingIds.length > 0) {
          store.setEdgesAnimated(outgoingIds, true)
          setTimeout(() => {
            usePipelineStore.getState().setEdgesAnimated(outgoingIds, false)
          }, 500)
        }
      } else if (event.status === 'error') {
        store.setNodeStatus(node.id, 'error', {
          error: event.error ?? `Stage "${event.stage}" failed`,
        })
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Demo mode — simulated execution with realistic latencies
  // ---------------------------------------------------------------------------

  /**
   * Demo execution — simulates trace replay with staggered animations.
   *
   * Improvements over phase 1:
   * - Uses NODE_REGISTRY.estimatedLatencyMs for realistic per-node latency
   * - Randomly selects a route and skips nodes not on that route
   * - Applies jitter for natural feel
   * - Properly handles edge animations per-node (not per-level)
   */
  private async executeDemo(runId: string) {
    const store = usePipelineStore.getState()
    const { nodes, edges } = store

    // Pick a random route weighted by probability
    const route = this.pickDemoRoute()
    const activeNodeTypes = getActiveNodeTypesForRoute(route)

    // Mark non-active nodes as skipped immediately
    for (const node of nodes) {
      if (!node.type) continue
      if (!activeNodeTypes.has(node.type)) {
        usePipelineStore.getState().setNodeStatus(node.id, 'skipped', {
          skipReason: `Route: ${route}`,
        })
      }
    }

    // Build topology only from active nodes
    const activeNodes = nodes.filter((n) => n.type && activeNodeTypes.has(n.type))
    const activeNodeIds = new Set(activeNodes.map((n) => n.id))
    const activeEdges = edges
      .filter((e) => activeNodeIds.has(e.source) && activeNodeIds.has(e.target))
      .map((e) => ({ source: e.source, target: e.target }))
    const levels = topologicalSort(
      activeNodes.map((n) => n.id),
      activeEdges
    )

    let totalLatency = 0
    let totalCost = 0

    for (const level of levels) {
      if (this.abortController?.signal.aborted) return

      // Set nodes in this level to running
      for (const nodeId of level) {
        usePipelineStore.getState().setNodeStatus(nodeId, 'running')
      }

      // Calculate the max latency in this level (parallel execution)
      const levelLatencies = level.map((id) => {
        const node = nodes.find((n) => n.id === id)
        const def = node?.type ? NODE_REGISTRY[node.type] : null
        const base = def?.estimatedLatencyMs ?? 50
        // Apply +/- 30% jitter
        const jitter = base * 0.3 * (Math.random() * 2 - 1)
        return Math.max(10, Math.round(base + jitter))
      })
      const maxLevelLatency = Math.max(...levelLatencies)

      // Wait for the level to "complete" (capped at 2s for demo responsiveness)
      await this.sleep(Math.min(maxLevelLatency, 2000))
      if (this.abortController?.signal.aborted) return

      // Complete each node with its individual latency
      for (let i = 0; i < level.length; i++) {
        const nodeId = level[i]
        const node = nodes.find((n) => n.id === nodeId)
        const def = node?.type ? NODE_REGISTRY[node.type] : null
        const nodeLatency = levelLatencies[i]
        const nodeCost = def?.estimatedCostPerCall ?? 0

        usePipelineStore.getState().setNodeStatus(nodeId, 'success', {
          latencyMs: nodeLatency,
          cost: nodeCost,
        })

        totalCost += nodeCost

        // Animate outgoing edges from this node
        const outgoingIds = edges
          .filter((e) => e.source === nodeId)
          .map((e) => e.id)
        if (outgoingIds.length > 0) {
          usePipelineStore.getState().setEdgesAnimated(outgoingIds, true)
          setTimeout(() => {
            usePipelineStore.getState().setEdgesAnimated(outgoingIds, false)
          }, 600)
        }
      }

      totalLatency += maxLevelLatency
    }

    usePipelineStore.getState().completeExecution(runId, {
      totalLatencyMs: totalLatency,
      totalCost: Math.round(totalCost * 10000) / 10000,
      route,
      response: `Demo mode (route: ${route}) — connect to the FastAPI backend for real responses. Configure PIPELINE_API_URL in .env.local.`,
    })
  }

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  /**
   * Replays trace data from response metadata onto canvas nodes.
   * Used as fallback when full trace spans are not available.
   */
  private replayFromMetadata(
    nodes: PipelineNode[],
    metadata: { route: string; latency_ms: number; stages_completed: string[]; safety_passed: boolean }
  ) {
    const store = usePipelineStore.getState()
    const stagesSet = new Set(metadata.stages_completed)

    for (const node of nodes) {
      if (!node.type) continue

      // Check if this node's stage was completed using the stage mapping
      const stageForNode = Object.entries(STAGE_TO_NODES).find(([, types]) =>
        types.includes(node.type!)
      )
      const stageName = stageForNode?.[0]
      const isCompleted = stageName ? stagesSet.has(stageName) : false

      if (isCompleted) {
        const def = NODE_REGISTRY[node.type]
        // Allocate latency proportionally based on estimatedLatencyMs
        const stageNodeTypes = stageName ? (STAGE_TO_NODES[stageName] ?? []) : []
        const stageNodes = nodes.filter((n) => n.type && stageNodeTypes.includes(n.type))
        const totalEstimate = stageNodes.reduce((sum, n) => {
          const d = n.type ? NODE_REGISTRY[n.type] : null
          return sum + (d?.estimatedLatencyMs ?? 10)
        }, 0)
        const myEstimate = def?.estimatedLatencyMs ?? 10
        const proportion = totalEstimate > 0 ? myEstimate / totalEstimate : 1
        const stageLatency = metadata.latency_ms / metadata.stages_completed.length
        const nodeLatency = Math.round(stageLatency * proportion * 100) / 100

        store.setNodeStatus(node.id, 'success', {
          latencyMs: nodeLatency,
          cost: def?.estimatedCostPerCall ?? 0,
        })
      } else if (!metadata.safety_passed && NODE_REGISTRY[node.type]?.category === 'safety') {
        store.setNodeStatus(node.id, 'blocked')
      } else {
        store.setNodeStatus(node.id, 'skipped', {
          skipReason: `Route: ${metadata.route}`,
        })
      }
    }
  }

  /** Picks a random demo route based on weighted probabilities. */
  private pickDemoRoute(): string {
    const rand = Math.random()
    let cumulative = 0
    for (const { route, weight } of DEMO_ROUTES) {
      cumulative += weight
      if (rand < cumulative) return route
    }
    return 'rag_knowledge_base'
  }

  /** Sleep with abort support. */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => {
      const timer = setTimeout(resolve, ms)
      this.abortController?.signal.addEventListener('abort', () => {
        clearTimeout(timer)
        resolve()
      })
    })
  }
}

export const pipelineExecutor = new PipelineExecutor()
