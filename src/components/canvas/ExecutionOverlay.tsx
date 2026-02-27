'use client'

import { useEffect, useState, useRef } from 'react'
import { usePipelineStore } from '@/lib/store/pipeline-store'
import { NODE_REGISTRY } from '@/lib/nodes/registry'
import { AlertTriangle, Ban, Loader2 } from 'lucide-react'

/**
 * Floating overlay displayed during pipeline execution.
 * Shows progress bar, current stage, elapsed time, and error/blocked banners.
 * Positioned in the top-right corner of the canvas.
 */
export function ExecutionOverlay() {
  const executionStatus = usePipelineStore((s) => s.executionStatus)
  const nodes = usePipelineStore((s) => s.nodes)
  const executionRuns = usePipelineStore((s) => s.executionRuns)

  const [elapsed, setElapsed] = useState(0)
  const startTimeRef = useRef<number>(0)
  const rafRef = useRef<number>(0)

  // Count node statuses
  const totalNodes = nodes.length
  const completedNodes = nodes.filter(
    (n) => n.data.execution?.status === 'success'
  ).length
  const errorNodes = nodes.filter(
    (n) => n.data.execution?.status === 'error'
  )
  const blockedNodes = nodes.filter(
    (n) => n.data.execution?.status === 'blocked'
  )
  const runningNodes = nodes.filter(
    (n) => n.data.execution?.status === 'running'
  )

  // Current running stage label
  const currentStageLabel =
    runningNodes.length > 0
      ? runningNodes
          .map((n) => {
            const def = n.type ? NODE_REGISTRY[n.type] : null
            return def?.label ?? n.type ?? 'Unknown'
          })
          .join(', ')
      : null

  // Elapsed time counter
  useEffect(() => {
    if (executionStatus === 'running') {
      startTimeRef.current = Date.now()
      setElapsed(0)

      const tick = () => {
        setElapsed(Date.now() - startTimeRef.current)
        rafRef.current = requestAnimationFrame(tick)
      }
      rafRef.current = requestAnimationFrame(tick)

      return () => cancelAnimationFrame(rafRef.current)
    } else {
      cancelAnimationFrame(rafRef.current)
    }
  }, [executionStatus])

  // Only show during/after execution (not idle with no runs)
  if (executionStatus === 'idle') return null

  const progress = totalNodes > 0 ? completedNodes / totalNodes : 0
  const progressPercent = Math.round(progress * 100)

  const hasError = errorNodes.length > 0 || executionStatus === 'error'
  const hasBlocked = blockedNodes.length > 0

  const formatElapsed = (ms: number) => {
    if (ms < 1000) return `${ms}ms`
    const seconds = (ms / 1000).toFixed(1)
    return `${seconds}s`
  }

  // Determine the latest run's total latency for completed state
  const latestRun = executionRuns[0]
  const displayTime =
    executionStatus === 'running'
      ? formatElapsed(elapsed)
      : latestRun?.totalLatencyMs !== undefined
        ? formatElapsed(latestRun.totalLatencyMs)
        : formatElapsed(elapsed)

  return (
    <div className="pointer-events-none absolute right-3 top-3 z-20 w-64">
      <div className="pointer-events-auto rounded-lg border border-zinc-700 bg-zinc-900/90 p-3 shadow-xl backdrop-blur">
        {/* Header */}
        <div className="mb-2 flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-xs font-medium text-zinc-300">
            {executionStatus === 'running' && (
              <Loader2 size={12} className="animate-spin text-yellow-400" />
            )}
            <span>
              {executionStatus === 'running'
                ? 'Executing...'
                : executionStatus === 'completed'
                  ? 'Completed'
                  : executionStatus === 'error'
                    ? 'Error'
                    : executionStatus === 'aborted'
                      ? 'Aborted'
                      : 'Idle'}
            </span>
          </div>
          <span className="font-mono text-xs text-zinc-400">{displayTime}</span>
        </div>

        {/* Progress bar */}
        <div className="mb-2 h-1.5 overflow-hidden rounded-full bg-zinc-800">
          <div
            className={`h-full rounded-full transition-all duration-300 ${
              hasError
                ? 'bg-red-500'
                : hasBlocked
                  ? 'bg-orange-500'
                  : executionStatus === 'completed'
                    ? 'bg-green-500'
                    : 'bg-blue-500'
            }`}
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        {/* Stage info */}
        <div className="flex items-center justify-between text-[10px] text-zinc-500">
          <span>
            {completedNodes}/{totalNodes} nodes
          </span>
          <span>{progressPercent}%</span>
        </div>

        {/* Current stage name */}
        {currentStageLabel && (
          <div className="mt-1.5 truncate text-[10px] text-yellow-400/80">
            Running: {currentStageLabel}
          </div>
        )}

        {/* Error banner */}
        {hasError && (
          <div className="mt-2 flex items-center gap-1.5 rounded bg-red-950/60 px-2 py-1 text-[10px] text-red-400">
            <AlertTriangle size={10} className="shrink-0" />
            <span>
              Pipeline error
              {errorNodes.length > 0 &&
                ` (${errorNodes.length} node${errorNodes.length > 1 ? 's' : ''})`}
            </span>
          </div>
        )}

        {/* Blocked banner */}
        {hasBlocked && !hasError && (
          <div className="mt-2 flex items-center gap-1.5 rounded bg-orange-950/60 px-2 py-1 text-[10px] text-orange-400">
            <Ban size={10} className="shrink-0" />
            <span>
              Pipeline blocked
              {blockedNodes.length > 0 &&
                ` (${blockedNodes.length} node${blockedNodes.length > 1 ? 's' : ''})`}
            </span>
          </div>
        )}
      </div>
    </div>
  )
}
