import { usePipelineStore, type PipelineNode, type PipelineEdge } from '@/lib/store/pipeline-store'
import { topologicalSort } from './validator'
import { pipelineClient } from '@/lib/api/pipeline-client'
import { NODE_REGISTRY } from '@/lib/nodes/registry'

/**
 * MVP Trace Replay Executor
 *
 * Sends the full query to the backend in a single POST /api/v1/query,
 * receives the response + trace data, then replays the trace onto the
 * canvas with staggered animations per depth level.
 *
 * For the demo/offline mode, it simulates execution with fake latency.
 */
export class PipelineExecutor {
  private abortController: AbortController | null = null

  async execute(query: string, userId: string, tenantId: string, mode: 'live' | 'demo' = 'demo') {
    const store = usePipelineStore.getState()
    const runId = store.startExecution(query)

    this.abortController = new AbortController()

    try {
      if (mode === 'live') {
        await this.executeLive(runId, query, userId, tenantId)
      } else {
        await this.executeDemo(runId)
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

  /**
   * Live execution — calls the real backend.
   */
  private async executeLive(runId: string, query: string, userId: string, tenantId: string) {
    const store = usePipelineStore.getState()
    const { nodes, edges } = store

    // Set all nodes to running
    for (const node of nodes) {
      store.setNodeStatus(node.id, 'running')
    }

    const response = await pipelineClient.query({
      query,
      user_id: userId,
      tenant_id: tenantId,
    })

    // Map trace data back to nodes
    this.replayTraceOntoCanvas(nodes, edges, response.metadata)

    usePipelineStore.getState().completeExecution(runId, {
      totalLatencyMs: response.metadata.latency_ms,
      totalCost: response.metadata.cost_usd,
      route: response.metadata.route,
      response: response.answer,
    })
  }

  /**
   * Demo execution — simulates trace replay with staggered animations.
   */
  private async executeDemo(runId: string) {
    const store = usePipelineStore.getState()
    const { nodes, edges } = store

    const nodeIds = nodes.map((n) => n.id)
    const edgeList = edges.map((e) => ({ source: e.source, target: e.target }))
    const levels = topologicalSort(nodeIds, edgeList)

    let totalLatency = 0

    for (const level of levels) {
      if (this.abortController?.signal.aborted) return

      // Set nodes to running
      for (const nodeId of level) {
        usePipelineStore.getState().setNodeStatus(nodeId, 'running')
      }

      // Simulate latency based on node type
      const maxLatency = Math.max(
        ...level.map((id) => {
          const node = nodes.find((n) => n.id === id)
          const def = node?.type ? NODE_REGISTRY[node.type] : null
          return def?.estimatedLatencyMs ?? 50
        })
      )
      const jitter = maxLatency * 0.3 * (Math.random() - 0.5)
      const latency = Math.max(30, maxLatency + jitter)

      await this.sleep(Math.min(latency, 500))
      if (this.abortController?.signal.aborted) return

      // Complete nodes and animate outgoing edges
      for (const nodeId of level) {
        const node = nodes.find((n) => n.id === nodeId)
        const def = node?.type ? NODE_REGISTRY[node.type] : null
        const nodeLatency = (def?.estimatedLatencyMs ?? 50) + Math.random() * 20

        usePipelineStore.getState().setNodeStatus(nodeId, 'success', {
          latencyMs: nodeLatency,
          cost: def?.estimatedCostPerCall ?? 0,
        })

        // Animate outgoing edges from this node
        const outgoingIds = edges
          .filter((e) => e.source === nodeId)
          .map((e) => e.id)
        if (outgoingIds.length > 0) {
          usePipelineStore.getState().setEdgesAnimated(outgoingIds, true)
          setTimeout(() => {
            usePipelineStore.getState().setEdgesAnimated(outgoingIds, false)
          }, 500)
        }
      }

      totalLatency += latency
    }

    usePipelineStore.getState().completeExecution(runId, {
      totalLatencyMs: totalLatency,
      totalCost: 0.008,
      route: 'rag_knowledge_base',
      response: 'Demo mode — connect to the FastAPI backend for real responses. Use .env.local to configure PIPELINE_API_URL.',
    })
  }

  private replayTraceOntoCanvas(
    nodes: PipelineNode[],
    edges: PipelineEdge[],
    metadata: { route: string; latency_ms: number; stages_completed: string[]; safety_passed: boolean }
  ) {
    const store = usePipelineStore.getState()

    for (const node of nodes) {
      if (!node.type) continue

      // Check if this node's stage was in the completed stages
      const isCompleted = metadata.stages_completed.some((s) =>
        node.type!.includes(s) || s.includes(node.type!)
      )

      if (isCompleted) {
        store.setNodeStatus(node.id, 'success', {
          latencyMs: metadata.latency_ms / metadata.stages_completed.length,
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
