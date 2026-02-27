'use client'

import { useState, useCallback, useRef } from 'react'
import { Play, Square, X, ChevronDown, ChevronUp } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { useUIStore } from '@/lib/store/ui-store'
import { usePipelineStore } from '@/lib/store/pipeline-store'
import { pipelineExecutor } from '@/lib/engine/executor'

interface BatchResult {
  index: number
  query: string
  status: 'pending' | 'running' | 'success' | 'error'
  route?: string
  latencyMs?: number
  cost?: number
  response?: string
  error?: string
}

const DEFAULT_QUERIES = `What is the remote work policy?
How do I request time off?
What are the security best practices?
Who do I contact for IT support?
What is the company dress code?`

export function BatchTestPanel() {
  const batchTestPanelOpen = useUIStore((s) => s.batchTestPanelOpen)
  const setBatchTestPanelOpen = useUIStore((s) => s.setBatchTestPanelOpen)
  const executionMode = useUIStore((s) => s.executionMode)

  const [queriesText, setQueriesText] = useState(DEFAULT_QUERIES)
  const [results, setResults] = useState<BatchResult[]>([])
  const [isRunning, setIsRunning] = useState(false)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [totalQueries, setTotalQueries] = useState(0)
  const [showResults, setShowResults] = useState(true)
  const abortRef = useRef(false)

  const handleRunBatch = useCallback(async () => {
    const queries = queriesText
      .split('\n')
      .map((q) => q.trim())
      .filter((q) => q.length > 0)

    if (queries.length === 0) return

    abortRef.current = false
    setIsRunning(true)
    setTotalQueries(queries.length)
    setShowResults(true)

    const batchResults: BatchResult[] = queries.map((query, index) => ({
      index,
      query,
      status: 'pending',
    }))
    setResults([...batchResults])

    for (let i = 0; i < queries.length; i++) {
      if (abortRef.current) break

      setCurrentIndex(i)
      batchResults[i].status = 'running'
      setResults([...batchResults])

      try {
        // Get current nodes to extract userId/tenantId
        const nodes = usePipelineStore.getState().nodes
        let userId = ''
        let tenantId = ''
        const queryInputNode = nodes.find((n) => n.type === 'query_input')
        if (queryInputNode?.data?.config) {
          const config = queryInputNode.data.config as Record<string, unknown>
          if (typeof config.user_id === 'string') userId = config.user_id
          if (typeof config.tenant_id === 'string') tenantId = config.tenant_id
        }

        // Execute the query
        await pipelineExecutor.execute(queries[i], userId, tenantId, executionMode)

        // Wait for the execution to fully complete
        await waitForExecutionComplete()

        // Read the latest run from the store
        const latestRun = usePipelineStore.getState().executionRuns[0]
        const execStatus = usePipelineStore.getState().executionStatus

        if (execStatus === 'aborted') {
          batchResults[i].status = 'error'
          batchResults[i].error = 'Aborted'
        } else if (latestRun && (latestRun.status === 'completed' || latestRun.status === 'error')) {
          batchResults[i].status = latestRun.status === 'completed' ? 'success' : 'error'
          batchResults[i].route = latestRun.route
          batchResults[i].latencyMs = latestRun.totalLatencyMs
          batchResults[i].cost = latestRun.totalCost
          batchResults[i].response = latestRun.response
          if (latestRun.status === 'error') {
            batchResults[i].error = 'Execution failed'
          }
        } else {
          batchResults[i].status = 'success'
          batchResults[i].route = latestRun?.route
          batchResults[i].latencyMs = latestRun?.totalLatencyMs
          batchResults[i].cost = latestRun?.totalCost
          batchResults[i].response = latestRun?.response
        }
      } catch (err) {
        batchResults[i].status = 'error'
        batchResults[i].error = err instanceof Error ? err.message : 'Unknown error'
      }

      setResults([...batchResults])
    }

    // Mark remaining as skipped if aborted
    if (abortRef.current) {
      for (let i = 0; i < batchResults.length; i++) {
        if (batchResults[i].status === 'pending') {
          batchResults[i].status = 'error'
          batchResults[i].error = 'Skipped (batch aborted)'
        }
      }
      setResults([...batchResults])
    }

    setIsRunning(false)
  }, [queriesText, executionMode])

  const handleAbort = useCallback(() => {
    abortRef.current = true
    pipelineExecutor.abort()
  }, [])

  if (!batchTestPanelOpen) return null

  // Compute aggregate stats from completed results
  const completedResults = results.filter((r) => r.status === 'success')
  const errorResults = results.filter((r) => r.status === 'error')
  const avgLatency =
    completedResults.length > 0
      ? completedResults.reduce((sum, r) => sum + (r.latencyMs ?? 0), 0) / completedResults.length
      : 0
  const totalCost = completedResults.reduce((sum, r) => sum + (r.cost ?? 0), 0)
  const errorRate = results.length > 0 ? (errorResults.length / results.length) * 100 : 0

  // Route distribution
  const routeCounts: Record<string, number> = {}
  for (const r of completedResults) {
    if (r.route) {
      routeCounts[r.route] = (routeCounts[r.route] ?? 0) + 1
    }
  }

  return (
    <div className="flex h-full flex-col border-t border-zinc-700 bg-zinc-900">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-zinc-700 px-3 py-2">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold text-zinc-200">Batch Test Runner</h3>
          {isRunning && (
            <Badge variant="outline" className="border-yellow-500/50 text-yellow-400 text-[10px]">
              {currentIndex + 1}/{totalQueries}
            </Badge>
          )}
        </div>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => setBatchTestPanelOpen(false)}
          className="h-6 w-6 p-0 text-zinc-400"
        >
          <X size={14} />
        </Button>
      </div>

      <div className="flex min-h-0 flex-1">
        {/* Left side: query input */}
        <div className="flex w-64 shrink-0 flex-col border-r border-zinc-700">
          <div className="px-3 pt-2 pb-1">
            <label className="text-[10px] font-medium uppercase tracking-wide text-zinc-500">
              Queries (one per line)
            </label>
          </div>
          <div className="flex-1 px-2 pb-1">
            <textarea
              value={queriesText}
              onChange={(e) => setQueriesText(e.target.value)}
              disabled={isRunning}
              className="h-full w-full resize-none rounded border border-zinc-700 bg-zinc-800 p-2 font-mono text-xs text-zinc-100 placeholder:text-zinc-500 focus:border-zinc-600 focus:outline-none disabled:opacity-50"
              placeholder="Enter queries, one per line..."
            />
          </div>
          <div className="flex gap-1.5 border-t border-zinc-700 p-2">
            {isRunning ? (
              <Button
                size="sm"
                variant="destructive"
                onClick={handleAbort}
                className="h-7 flex-1 gap-1 text-xs"
              >
                <Square size={12} />
                Abort
              </Button>
            ) : (
              <Button
                size="sm"
                onClick={handleRunBatch}
                className="h-7 flex-1 gap-1 bg-green-600 text-xs hover:bg-green-700"
              >
                <Play size={12} />
                Run Batch
              </Button>
            )}
          </div>
        </div>

        {/* Right side: results */}
        <div className="flex min-w-0 flex-1 flex-col">
          {results.length === 0 ? (
            <div className="flex h-full items-center justify-center text-xs text-zinc-500">
              Enter queries and click &quot;Run Batch&quot; to test
            </div>
          ) : (
            <>
              {/* Progress bar */}
              {isRunning && (
                <div className="border-b border-zinc-700 px-3 py-1.5">
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-zinc-800">
                    <div
                      className="h-full rounded-full bg-green-500 transition-all duration-300"
                      style={{
                        width: `${((results.filter((r) => r.status === 'success' || r.status === 'error').length) / totalQueries) * 100}%`,
                      }}
                    />
                  </div>
                </div>
              )}

              {/* Results table */}
              <button
                onClick={() => setShowResults((v) => !v)}
                className="flex items-center gap-1 border-b border-zinc-700 px-3 py-1 text-[10px] font-medium uppercase tracking-wide text-zinc-500 hover:text-zinc-400"
              >
                {showResults ? <ChevronDown size={10} /> : <ChevronUp size={10} />}
                Results ({results.length})
              </button>

              {showResults && (
                <ScrollArea className="flex-1">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-zinc-800 text-left text-[10px] uppercase tracking-wide text-zinc-500">
                        <th className="px-3 py-1.5 font-medium">#</th>
                        <th className="px-3 py-1.5 font-medium">Query</th>
                        <th className="px-3 py-1.5 font-medium">Route</th>
                        <th className="px-3 py-1.5 font-medium">Latency</th>
                        <th className="px-3 py-1.5 font-medium">Status</th>
                        <th className="px-3 py-1.5 font-medium">Response</th>
                      </tr>
                    </thead>
                    <tbody>
                      {results.map((r) => (
                        <tr
                          key={r.index}
                          className="border-b border-zinc-800/50 hover:bg-zinc-800/30"
                        >
                          <td className="px-3 py-1.5 text-zinc-500">{r.index + 1}</td>
                          <td className="max-w-[180px] truncate px-3 py-1.5 text-zinc-300" title={r.query}>
                            {r.query}
                          </td>
                          <td className="px-3 py-1.5 text-zinc-400">
                            {r.route ?? '-'}
                          </td>
                          <td className="px-3 py-1.5 font-mono text-zinc-400">
                            {r.latencyMs != null
                              ? r.latencyMs < 1000
                                ? `${r.latencyMs.toFixed(0)}ms`
                                : `${(r.latencyMs / 1000).toFixed(2)}s`
                              : '-'}
                          </td>
                          <td className="px-3 py-1.5">
                            <StatusBadge status={r.status} error={r.error} />
                          </td>
                          <td className="max-w-[200px] px-3 py-1.5">
                            {r.response ? (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <span className="block cursor-help truncate text-zinc-400">
                                    {r.response}
                                  </span>
                                </TooltipTrigger>
                                <TooltipContent
                                  side="top"
                                  className="max-w-sm border border-zinc-700 bg-zinc-900 text-zinc-200"
                                >
                                  <p className="max-h-40 overflow-auto whitespace-pre-wrap text-xs">
                                    {r.response}
                                  </p>
                                </TooltipContent>
                              </Tooltip>
                            ) : (
                              <span className="text-zinc-600">-</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </ScrollArea>
              )}

              {/* Aggregate stats */}
              {!isRunning && results.some((r) => r.status === 'success' || r.status === 'error') && (
                <div className="flex flex-wrap items-center gap-4 border-t border-zinc-700 px-3 py-2 text-[11px] text-zinc-400">
                  <div>
                    <span className="text-zinc-500">Avg Latency: </span>
                    <span className="font-mono text-zinc-300">
                      {avgLatency < 1000
                        ? `${avgLatency.toFixed(0)}ms`
                        : `${(avgLatency / 1000).toFixed(2)}s`}
                    </span>
                  </div>
                  <div>
                    <span className="text-zinc-500">Total Cost: </span>
                    <span className="font-mono text-zinc-300">${totalCost.toFixed(4)}</span>
                  </div>
                  <div>
                    <span className="text-zinc-500">Error Rate: </span>
                    <span className={`font-mono ${errorRate > 0 ? 'text-red-400' : 'text-green-400'}`}>
                      {errorRate.toFixed(1)}%
                    </span>
                  </div>
                  {Object.keys(routeCounts).length > 0 && (
                    <div className="flex items-center gap-1">
                      <span className="text-zinc-500">Routes: </span>
                      {Object.entries(routeCounts).map(([route, count]) => (
                        <Badge
                          key={route}
                          variant="outline"
                          className="text-[9px] border-zinc-600 text-zinc-400"
                        >
                          {route} ({((count / completedResults.length) * 100).toFixed(0)}%)
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}

function StatusBadge({ status, error }: { status: BatchResult['status']; error?: string }) {
  switch (status) {
    case 'pending':
      return <span className="text-zinc-600">pending</span>
    case 'running':
      return (
        <span className="flex items-center gap-1 text-yellow-400">
          <span className="h-2 w-2 animate-spin rounded-full border border-yellow-400 border-t-transparent" />
          running
        </span>
      )
    case 'success':
      return <span className="text-green-400">success</span>
    case 'error':
      return (
        <Tooltip>
          <TooltipTrigger asChild>
            <span className="cursor-help text-red-400">error</span>
          </TooltipTrigger>
          {error && (
            <TooltipContent
              side="top"
              className="max-w-xs border border-zinc-700 bg-zinc-900 text-red-300"
            >
              {error}
            </TooltipContent>
          )}
        </Tooltip>
      )
    default:
      return null
  }
}

/**
 * Waits for the pipeline executor to finish running by polling the store.
 * Returns when executionStatus is no longer 'running'.
 */
function waitForExecutionComplete(): Promise<void> {
  return new Promise((resolve) => {
    const check = () => {
      const status = usePipelineStore.getState().executionStatus
      if (status !== 'running') {
        resolve()
      } else {
        setTimeout(check, 100)
      }
    }
    // Start checking after a tick to allow the execution to begin
    setTimeout(check, 50)
  })
}
