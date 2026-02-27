'use client'

import { useCallback, useEffect, useState } from 'react'
import { Play, Square, RotateCcw, Layout, Download, Upload } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { usePipelineStore } from '@/lib/store/pipeline-store'
import { useUIStore } from '@/lib/store/ui-store'
import { getLayoutedElements } from '@/lib/layout/elk-layout'
import { exportPipelineToJSON, importPipelineFromJSON } from '@/lib/engine/serializer'

export function CanvasControls() {
  const nodes = usePipelineStore((s) => s.nodes)
  const edges = usePipelineStore((s) => s.edges)
  const setNodes = usePipelineStore((s) => s.setNodes)
  const setEdges = usePipelineStore((s) => s.setEdges)
  const executionStatus = usePipelineStore((s) => s.executionStatus)
  const startExecution = usePipelineStore((s) => s.startExecution)
  const resetExecution = usePipelineStore((s) => s.resetExecution)
  const loadPipeline = usePipelineStore((s) => s.loadPipeline)

  const [query, setQuery] = useState('What is the remote work policy?')
  const [layouting, setLayouting] = useState(false)

  const handleAutoLayout = useCallback(async () => {
    setLayouting(true)
    try {
      const { nodes: layoutedNodes, edges: layoutedEdges } = await getLayoutedElements(nodes, edges)
      setNodes(layoutedNodes)
      setEdges(layoutedEdges)
    } catch (err) {
      console.error('Layout failed:', err)
    } finally {
      setLayouting(false)
    }
  }, [nodes, edges, setNodes, setEdges])

  const handleRun = useCallback(() => {
    if (!query.trim()) return
    const runId = startExecution(query)
    // MVP: simulated execution replay
    // Phase 3 will connect to the real backend
    simulateExecution(runId)
  }, [query, startExecution])

  const handleStop = useCallback(() => {
    usePipelineStore.getState().setExecutionStatus('aborted')
  }, [])

  const handleReset = useCallback(() => {
    resetExecution()
  }, [resetExecution])

  const handleExport = useCallback(() => {
    const json = exportPipelineToJSON(nodes, edges)
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'pipeline.json'
    a.click()
    URL.revokeObjectURL(url)
  }, [nodes, edges])

  const handleImport = useCallback(() => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.json'
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (!file) return
      const reader = new FileReader()
      reader.onload = (ev) => {
        const result = importPipelineFromJSON(ev.target?.result as string)
        if (result) {
          loadPipeline(result)
        }
      }
      reader.readAsText(file)
    }
    input.click()
  }, [loadPipeline])

  const isRunning = executionStatus === 'running'

  // Listen for keyboard shortcut (Space) to trigger run
  useEffect(() => {
    const onPipelineRun = () => {
      if (executionStatus !== 'running') {
        handleRun()
      }
    }
    window.addEventListener('pipeline:run', onPipelineRun)
    return () => window.removeEventListener('pipeline:run', onPipelineRun)
  }, [executionStatus, handleRun])

  return (
    <div className="flex items-center gap-2 rounded-lg border border-zinc-700 bg-zinc-900/90 p-2 shadow-lg backdrop-blur">
      <Input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Enter query..."
        className="h-8 w-72 border-zinc-700 bg-zinc-800 text-sm text-zinc-100 placeholder:text-zinc-500"
        onKeyDown={(e) => e.key === 'Enter' && !isRunning && handleRun()}
        disabled={isRunning}
      />

      {isRunning ? (
        <Button size="sm" variant="destructive" onClick={handleStop} className="h-8 gap-1.5">
          <Square size={14} />
          Stop
        </Button>
      ) : (
        <Button size="sm" onClick={handleRun} className="h-8 gap-1.5 bg-green-600 hover:bg-green-700">
          <Play size={14} />
          Run
        </Button>
      )}

      <Button size="sm" variant="ghost" onClick={handleReset} className="h-8 text-zinc-400" disabled={isRunning}>
        <RotateCcw size={14} />
      </Button>

      <div className="mx-1 h-6 w-px bg-zinc-700" />

      <Button
        size="sm"
        variant="ghost"
        onClick={handleAutoLayout}
        className="h-8 gap-1.5 text-zinc-400"
        disabled={layouting}
      >
        <Layout size={14} />
        {layouting ? 'Layouting...' : 'Auto Layout'}
      </Button>

      <div className="mx-1 h-6 w-px bg-zinc-700" />

      <Button size="sm" variant="ghost" onClick={handleExport} className="h-8 text-zinc-400">
        <Download size={14} />
      </Button>
      <Button size="sm" variant="ghost" onClick={handleImport} className="h-8 text-zinc-400">
        <Upload size={14} />
      </Button>
    </div>
  )
}

/**
 * Simulated execution for MVP — replays a fake trace onto the canvas
 * with staggered animations. Will be replaced by real backend calls in Phase 3.
 */
async function simulateExecution(runId: string) {
  const store = usePipelineStore.getState()
  const { nodes, edges } = store

  // Build adjacency for topological sort
  const nodeIds = nodes.map((n) => n.id)
  const edgeList = edges.map((e) => ({ source: e.source, target: e.target }))

  // Simple BFS-based level assignment
  const inDegree = new Map<string, number>()
  const adj = new Map<string, string[]>()
  for (const id of nodeIds) {
    inDegree.set(id, 0)
    adj.set(id, [])
  }
  for (const e of edgeList) {
    if (adj.has(e.source) && inDegree.has(e.target)) {
      adj.get(e.source)!.push(e.target)
      inDegree.set(e.target, (inDegree.get(e.target) ?? 0) + 1)
    }
  }

  const levels: string[][] = []
  let queue = nodeIds.filter((id) => inDegree.get(id) === 0)
  while (queue.length > 0) {
    levels.push([...queue])
    const next: string[] = []
    for (const id of queue) {
      for (const neighbor of adj.get(id) ?? []) {
        const d = (inDegree.get(neighbor) ?? 1) - 1
        inDegree.set(neighbor, d)
        if (d === 0) next.push(neighbor)
      }
    }
    queue = next
  }

  // Animate level by level
  let totalLatency = 0
  for (const level of levels) {
    // Check abort
    if (usePipelineStore.getState().executionStatus !== 'running') return

    // Set all nodes in level to "running"
    for (const nodeId of level) {
      usePipelineStore.getState().setNodeStatus(nodeId, 'running')
    }

    // Simulate stage latency
    const latency = 50 + Math.random() * 200
    await new Promise((r) => setTimeout(r, latency))

    // Set all nodes in level to "success" and animate outgoing edges
    for (const nodeId of level) {
      usePipelineStore.getState().setNodeStatus(nodeId, 'success', {
        latencyMs: latency,
        cost: Math.random() * 0.002,
      })

      // Animate outgoing edges from this node
      animateOutgoingEdges(nodeId, edges)
    }
    totalLatency += latency
  }

  usePipelineStore.getState().completeExecution(runId, {
    totalLatencyMs: totalLatency,
    totalCost: 0.012,
    route: 'rag_knowledge_base',
    response: 'This is a simulated response. Connect to the backend to see real results.',
  })
}

/**
 * Briefly sets `data.animated = true` on all outgoing edges from a node,
 * then resets to false after 500ms. Creates the visual "data flowing" effect.
 */
function animateOutgoingEdges(
  nodeId: string,
  edgeSnapshot: { id: string; source: string }[]
) {
  const outgoing = edgeSnapshot.filter((e) => e.source === nodeId)
  if (outgoing.length === 0) return

  const outgoingIds = outgoing.map((e) => e.id)

  // Set animated = true
  usePipelineStore.getState().setEdgesAnimated(outgoingIds, true)

  // Reset after 500ms (matches the CSS animation duration of 600ms, slightly shorter to avoid overlap)
  setTimeout(() => {
    usePipelineStore.getState().setEdgesAnimated(outgoingIds, false)
  }, 500)
}
