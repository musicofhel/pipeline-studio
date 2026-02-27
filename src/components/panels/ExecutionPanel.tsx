'use client'

import { useState, useCallback } from 'react'
import { Clock, DollarSign, GitBranch, CheckCircle, XCircle, Timer } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { usePipelineStore } from '@/lib/store/pipeline-store'
import { NODE_REGISTRY } from '@/lib/nodes/registry'
import { NodeDataInspector } from './NodeDataInspector'

export function ExecutionPanel() {
  const executionStatus = usePipelineStore((s) => s.executionStatus)
  const executionRuns = usePipelineStore((s) => s.executionRuns)
  const nodes = usePipelineStore((s) => s.nodes)
  const selectedNodeId = usePipelineStore((s) => s.selectedNodeId)
  const setSelectedNodeId = usePipelineStore((s) => s.setSelectedNodeId)

  const [activeTab, setActiveTab] = useState('overview')

  const handleNodeClick = useCallback(
    (nodeId: string) => {
      setSelectedNodeId(nodeId)
      setActiveTab('inspector')
    },
    [setSelectedNodeId]
  )

  if (executionStatus === 'idle' && executionRuns.length === 0) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-zinc-500">
        Run a query to see execution results
      </div>
    )
  }

  const latestRun = executionRuns[0]
  const completedNodes = nodes.filter((n) => n.data.execution?.status === 'success')
  const errorNodes = nodes.filter((n) => n.data.execution?.status === 'error')
  const runningNodes = nodes.filter((n) => n.data.execution?.status === 'running')
  const skippedNodes = nodes.filter((n) => n.data.execution?.status === 'skipped')

  return (
    <div className="flex h-full flex-col">
      {/* Summary bar */}
      {latestRun && (
        <div className="flex items-center gap-3 border-b border-zinc-700 px-3 py-2">
          <Badge
            variant="outline"
            className={
              latestRun.status === 'completed'
                ? 'border-green-500/50 text-green-400'
                : latestRun.status === 'running'
                ? 'border-yellow-500/50 text-yellow-400'
                : 'border-red-500/50 text-red-400'
            }
          >
            {latestRun.status}
          </Badge>
          {latestRun.totalLatencyMs !== undefined && (
            <div className="flex items-center gap-1 text-xs text-zinc-400">
              <Clock size={12} />
              {latestRun.totalLatencyMs < 1000
                ? `${latestRun.totalLatencyMs.toFixed(0)}ms`
                : `${(latestRun.totalLatencyMs / 1000).toFixed(2)}s`}
            </div>
          )}
          {latestRun.totalCost !== undefined && (
            <div className="flex items-center gap-1 text-xs text-zinc-400">
              <DollarSign size={12} />
              ${latestRun.totalCost.toFixed(4)}
            </div>
          )}
          {latestRun.route && (
            <div className="flex items-center gap-1 text-xs text-zinc-400">
              <GitBranch size={12} />
              {latestRun.route}
            </div>
          )}
        </div>
      )}

      {/* Tabbed content */}
      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        className="flex min-h-0 flex-1 flex-col"
      >
        <TabsList className="mx-2 mt-2 w-auto shrink-0">
          <TabsTrigger value="overview" className="text-xs">
            Overview
          </TabsTrigger>
          <TabsTrigger value="inspector" className="text-xs">
            Data Inspector
          </TabsTrigger>
          <TabsTrigger value="timeline" className="text-xs">
            Timeline
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="flex min-h-0 flex-1 flex-col">
          {/* Node status list */}
          <ScrollArea className="flex-1">
            <div className="space-y-0.5 p-2">
              {nodes
                .filter((n) => n.data.execution)
                .sort((a, b) => {
                  const order: Record<string, number> = {
                    success: 0,
                    running: 1,
                    error: 2,
                    skipped: 3,
                    blocked: 4,
                  }
                  return (
                    (order[a.data.execution!.status] ?? 5) -
                    (order[b.data.execution!.status] ?? 5)
                  )
                })
                .map((n) => {
                  const def = n.type ? NODE_REGISTRY[n.type] : null
                  const exec = n.data.execution!
                  const isSelected = n.id === selectedNodeId
                  return (
                    <button
                      type="button"
                      key={n.id}
                      onClick={() => handleNodeClick(n.id)}
                      className={`flex w-full items-center justify-between rounded px-2 py-1 text-xs transition-colors ${
                        isSelected
                          ? 'bg-zinc-700/60 ring-1 ring-zinc-600'
                          : 'hover:bg-zinc-800'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        {exec.status === 'success' && (
                          <CheckCircle size={12} className="text-green-400" />
                        )}
                        {exec.status === 'error' && (
                          <XCircle size={12} className="text-red-400" />
                        )}
                        {exec.status === 'running' && (
                          <div className="h-3 w-3 animate-spin rounded-full border-2 border-yellow-400 border-t-transparent" />
                        )}
                        {exec.status === 'skipped' && (
                          <div className="h-3 w-3 rounded-full bg-zinc-600" />
                        )}
                        <span className="text-zinc-300">
                          {def?.label ?? n.type}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-zinc-500">
                        {exec.latencyMs !== undefined && (
                          <span>
                            {exec.latencyMs < 1000
                              ? `${exec.latencyMs.toFixed(0)}ms`
                              : `${(exec.latencyMs / 1000).toFixed(2)}s`}
                          </span>
                        )}
                        {exec.error && (
                          <span className="max-w-32 truncate text-red-400">
                            {exec.error}
                          </span>
                        )}
                      </div>
                    </button>
                  )
                })}
            </div>
          </ScrollArea>

          {/* Response preview */}
          {latestRun?.response && (
            <div className="border-t border-zinc-700 p-3">
              <h4 className="mb-1 text-xs font-medium text-zinc-400">
                Response
              </h4>
              <p className="text-xs leading-relaxed text-zinc-300">
                {latestRun.response}
              </p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="inspector" className="min-h-0 flex-1">
          {selectedNodeId ? (
            <NodeDataInspector nodeId={selectedNodeId} />
          ) : (
            <div className="flex h-full flex-col items-center justify-center gap-2 text-zinc-500">
              <p className="text-sm">No node selected</p>
              <p className="text-xs text-zinc-600">
                Click a node in the Overview tab to inspect its data
              </p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="timeline" className="min-h-0 flex-1">
          <div className="flex h-full flex-col items-center justify-center gap-2 text-zinc-500">
            <Timer size={24} className="text-zinc-600" />
            <p className="text-sm">Timeline View</p>
            <p className="text-xs text-zinc-600">Coming soon</p>
          </div>
        </TabsContent>
      </Tabs>

      {/* Stats footer */}
      <div className="flex items-center gap-4 border-t border-zinc-700 px-3 py-1.5 text-[10px] text-zinc-500">
        <span>{completedNodes.length} completed</span>
        {runningNodes.length > 0 && (
          <span className="text-yellow-400">
            {runningNodes.length} running
          </span>
        )}
        {errorNodes.length > 0 && (
          <span className="text-red-400">{errorNodes.length} errors</span>
        )}
        {skippedNodes.length > 0 && (
          <span>{skippedNodes.length} skipped</span>
        )}
      </div>
    </div>
  )
}
