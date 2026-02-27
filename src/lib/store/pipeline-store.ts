import { create } from 'zustand'
import { temporal } from 'zundo'
import {
  type Node,
  type Edge,
  type OnNodesChange,
  type OnEdgesChange,
  type OnConnect,
  applyNodeChanges,
  applyEdgeChanges,
  addEdge,
} from '@xyflow/react'
import { PipelineNodeData, PipelineEdgeData, NodeStatus } from '@/types/nodes'

export type PipelineNode = Node<PipelineNodeData>
export type PipelineEdge = Edge<PipelineEdgeData>

export type ExecutionStatus = 'idle' | 'running' | 'completed' | 'error' | 'aborted'

interface ExecutionRun {
  id: string
  query: string
  status: ExecutionStatus
  startTime: number
  endTime?: number
  totalLatencyMs?: number
  totalCost?: number
  route?: string
  response?: string
}

interface PipelineState {
  nodes: PipelineNode[]
  edges: PipelineEdge[]
  selectedNodeId: string | null
  executionStatus: ExecutionStatus
  executionRuns: ExecutionRun[]
  currentRunId: string | null

  // Node/edge mutations
  onNodesChange: OnNodesChange<PipelineNode>
  onEdgesChange: OnEdgesChange<PipelineEdge>
  onConnect: OnConnect
  setNodes: (nodes: PipelineNode[]) => void
  setEdges: (edges: PipelineEdge[]) => void
  addNode: (node: PipelineNode) => void
  removeNode: (nodeId: string) => void
  duplicateNode: (nodeId: string) => void

  // Selection
  setSelectedNodeId: (nodeId: string | null) => void

  // Node config
  updateNodeConfig: (nodeId: string, config: Record<string, unknown>) => void

  // Execution
  setNodeStatus: (nodeId: string, status: NodeStatus, data?: Partial<import('@/types/nodes').NodeExecutionData>) => void
  setExecutionStatus: (status: ExecutionStatus) => void
  startExecution: (query: string) => string
  completeExecution: (runId: string, result: { totalLatencyMs: number; totalCost: number; route: string; response: string }) => void
  resetExecution: () => void

  // Persistence
  loadPipeline: (data: { nodes: PipelineNode[]; edges: PipelineEdge[] }) => void
  exportPipeline: () => { nodes: PipelineNode[]; edges: PipelineEdge[] }
}

export const usePipelineStore = create<PipelineState>()(
  temporal(
    (set, get) => ({
      nodes: [],
      edges: [],
      selectedNodeId: null,
      executionStatus: 'idle',
      executionRuns: [],
      currentRunId: null,

      onNodesChange: (changes) => {
        set({ nodes: applyNodeChanges(changes, get().nodes) })
      },

      onEdgesChange: (changes) => {
        set({ edges: applyEdgeChanges(changes, get().edges) })
      },

      onConnect: (connection) => {
        set({ edges: addEdge(connection, get().edges) })
      },

      setNodes: (nodes) => set({ nodes }),
      setEdges: (edges) => set({ edges }),

      addNode: (node) => {
        set({ nodes: [...get().nodes, node] })
      },

      removeNode: (nodeId) => {
        set({
          nodes: get().nodes.filter((n) => n.id !== nodeId),
          edges: get().edges.filter((e) => e.source !== nodeId && e.target !== nodeId),
          selectedNodeId: get().selectedNodeId === nodeId ? null : get().selectedNodeId,
        })
      },

      duplicateNode: (nodeId) => {
        const node = get().nodes.find((n) => n.id === nodeId)
        if (!node) return
        const newNode: PipelineNode = {
          ...node,
          id: `${node.type}-${Date.now()}`,
          position: { x: node.position.x + 50, y: node.position.y + 50 },
          selected: false,
          data: { ...node.data, config: { ...node.data.config }, execution: undefined },
        }
        set({ nodes: [...get().nodes, newNode] })
      },

      setSelectedNodeId: (nodeId) => set({ selectedNodeId: nodeId }),

      updateNodeConfig: (nodeId, config) => {
        set({
          nodes: get().nodes.map((n) =>
            n.id === nodeId ? { ...n, data: { ...n.data, config: { ...n.data.config, ...config } } } : n
          ),
        })
      },

      setNodeStatus: (nodeId, status, data) => {
        set({
          nodes: get().nodes.map((n) =>
            n.id === nodeId
              ? {
                  ...n,
                  data: {
                    ...n.data,
                    execution: { ...n.data.execution, status, ...data },
                  },
                }
              : n
          ),
        })
      },

      setExecutionStatus: (status) => set({ executionStatus: status }),

      startExecution: (query) => {
        const runId = `run-${Date.now()}`
        const run: ExecutionRun = {
          id: runId,
          query,
          status: 'running',
          startTime: Date.now(),
        }
        // Reset all node execution states
        const resetNodes = get().nodes.map((n) => ({
          ...n,
          data: { ...n.data, execution: undefined },
        }))
        set({
          nodes: resetNodes,
          executionStatus: 'running',
          currentRunId: runId,
          executionRuns: [run, ...get().executionRuns].slice(0, 50),
        })
        return runId
      },

      completeExecution: (runId, result) => {
        set({
          executionStatus: 'completed',
          currentRunId: null,
          executionRuns: get().executionRuns.map((r) =>
            r.id === runId
              ? { ...r, status: 'completed' as const, endTime: Date.now(), ...result }
              : r
          ),
        })
      },

      resetExecution: () => {
        const resetNodes = get().nodes.map((n) => ({
          ...n,
          data: { ...n.data, execution: undefined },
        }))
        set({
          nodes: resetNodes,
          executionStatus: 'idle',
          currentRunId: null,
        })
      },

      loadPipeline: (data) => {
        set({ nodes: data.nodes, edges: data.edges, selectedNodeId: null })
      },

      exportPipeline: () => {
        const { nodes, edges } = get()
        return {
          nodes: nodes.map((n) => ({ ...n, data: { ...n.data, execution: undefined } })),
          edges,
        }
      },
    }),
    { limit: 50 }
  )
)
