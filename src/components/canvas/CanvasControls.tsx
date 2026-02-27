'use client'

import { useCallback, useEffect, useState } from 'react'
import { Play, Square, RotateCcw, Layout, Download, Upload, Circle, AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { usePipelineStore } from '@/lib/store/pipeline-store'
import { useUIStore, type ExecutionMode } from '@/lib/store/ui-store'
import { getLayoutedElements } from '@/lib/layout/elk-layout'
import { exportPipelineToJSON, importPipelineFromJSON } from '@/lib/engine/serializer'
import { pipelineExecutor } from '@/lib/engine/executor'
import { useBackendStatus } from '@/lib/hooks/use-backend-status'
import { HealthDashboard } from '@/components/panels/HealthDashboard'

export function CanvasControls() {
  const nodes = usePipelineStore((s) => s.nodes)
  const edges = usePipelineStore((s) => s.edges)
  const setNodes = usePipelineStore((s) => s.setNodes)
  const setEdges = usePipelineStore((s) => s.setEdges)
  const executionStatus = usePipelineStore((s) => s.executionStatus)
  const resetExecution = usePipelineStore((s) => s.resetExecution)
  const loadPipeline = usePipelineStore((s) => s.loadPipeline)

  const executionMode = useUIStore((s) => s.executionMode)
  const setExecutionMode = useUIStore((s) => s.setExecutionMode)

  const backendStatus = useBackendStatus()

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

    // Extract userId and tenantId from the query_input node config if available
    let userId = ''
    let tenantId = ''
    const queryInputNode = nodes.find((n) => n.type === 'query_input')
    if (queryInputNode?.data?.config) {
      const config = queryInputNode.data.config as Record<string, unknown>
      if (typeof config.user_id === 'string') userId = config.user_id
      if (typeof config.tenant_id === 'string') tenantId = config.tenant_id
    }

    pipelineExecutor.execute(query, userId, tenantId, executionMode)
  }, [query, nodes, executionMode])

  const handleStop = useCallback(() => {
    pipelineExecutor.abort()
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

  const handleModeChange = useCallback(
    (value: string) => {
      setExecutionMode(value as ExecutionMode)
    },
    [setExecutionMode]
  )

  const isRunning = executionStatus === 'running'
  const showLiveWarning = executionMode === 'live' && !backendStatus.connected

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

      {/* Mode selector */}
      <div className="flex items-center gap-1.5">
        <Select value={executionMode} onValueChange={handleModeChange}>
          <SelectTrigger
            size="sm"
            className="h-7 w-[82px] border-zinc-700 bg-zinc-800 px-2 text-xs text-zinc-300"
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="border-zinc-700 bg-zinc-800">
            <SelectItem value="demo" className="text-xs text-zinc-300">
              Demo
            </SelectItem>
            <SelectItem value="live" className="text-xs text-zinc-300">
              Live
            </SelectItem>
          </SelectContent>
        </Select>

        {showLiveWarning && (
          <Tooltip>
            <TooltipTrigger asChild>
              <AlertTriangle size={14} className="text-amber-400" />
            </TooltipTrigger>
            <TooltipContent
              side="bottom"
              className="max-w-[200px] border border-zinc-700 bg-zinc-900 text-zinc-200"
            >
              Backend disconnected. Live mode will fail.
            </TooltipContent>
          </Tooltip>
        )}
      </div>

      {/* Backend status indicator — opens health dashboard on click */}
      <Tooltip>
        <TooltipTrigger asChild>
          <span>
            <HealthDashboard>
              <button
                type="button"
                className="flex items-center gap-1 rounded px-1 py-0.5 hover:bg-zinc-800"
              >
                <Circle
                  size={8}
                  className={
                    backendStatus.connected
                      ? 'fill-green-500 text-green-500'
                      : 'fill-red-500 text-red-500'
                  }
                />
              </button>
            </HealthDashboard>
          </span>
        </TooltipTrigger>
        <TooltipContent
          side="bottom"
          className="max-w-[280px] border border-zinc-700 bg-zinc-900 text-zinc-200"
        >
          <BackendStatusTooltip status={backendStatus} />
        </TooltipContent>
      </Tooltip>

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
 * Tooltip content showing backend version and service statuses.
 */
function BackendStatusTooltip({
  status,
}: {
  status: {
    connected: boolean
    version: string | null
    services: Record<string, { status: string; latency_ms?: number }> | null
    lastChecked: number | null
    error: string | null
  }
}) {
  if (!status.lastChecked) {
    return <span className="text-xs text-zinc-400">Checking backend...</span>
  }

  if (!status.connected) {
    return (
      <div className="space-y-1">
        <div className="text-xs font-medium text-red-400">Backend Disconnected</div>
        {status.error && (
          <div className="text-xs text-zinc-400">{status.error}</div>
        )}
        <div className="text-xs text-zinc-500">Click to retry</div>
      </div>
    )
  }

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-4">
        <span className="text-xs font-medium text-green-400">Connected</span>
        {status.version && (
          <span className="text-xs text-zinc-400">v{status.version}</span>
        )}
      </div>
      {status.services && Object.keys(status.services).length > 0 && (
        <div className="space-y-0.5">
          {Object.entries(status.services).map(([name, svc]) => (
            <div key={name} className="flex items-center justify-between gap-3 text-xs">
              <span className="text-zinc-300">{name}</span>
              <span className="flex items-center gap-1">
                <Circle
                  size={6}
                  className={
                    svc.status === 'healthy' || svc.status === 'ok'
                      ? 'fill-green-500 text-green-500'
                      : 'fill-red-500 text-red-500'
                  }
                />
                {svc.latency_ms != null && (
                  <span className="text-zinc-500">{Math.round(svc.latency_ms)}ms</span>
                )}
              </span>
            </div>
          ))}
        </div>
      )}
      <div className="text-xs text-zinc-500">Click to refresh</div>
    </div>
  )
}
