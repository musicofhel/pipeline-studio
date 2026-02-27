'use client'

import { useMemo, useState, useCallback } from 'react'
import { Timer } from 'lucide-react'
import { ScrollArea } from '@/components/ui/scroll-area'
import { usePipelineStore } from '@/lib/store/pipeline-store'
import { NODE_REGISTRY } from '@/lib/nodes/registry'
import { topologicalSort } from '@/lib/engine/validator'

interface TimelineRow {
  nodeId: string
  label: string
  color: string
  status: string
  latencyMs: number
  cost?: number
  startMs: number
  error?: string
  skipReason?: string
}

function formatLatency(ms: number): string {
  if (ms < 1000) return `${ms.toFixed(0)}ms`
  return `${(ms / 1000).toFixed(2)}s`
}

/** Generate nice tick marks for the time axis */
function computeTicks(totalMs: number): number[] {
  if (totalMs <= 0) return [0]

  // Choose a tick interval that yields 4-8 ticks
  const candidates = [1, 2, 5, 10, 20, 50, 100, 200, 500, 1000, 2000, 5000, 10000]
  let interval = candidates[candidates.length - 1]
  for (const c of candidates) {
    if (totalMs / c <= 8 && totalMs / c >= 2) {
      interval = c
      break
    }
  }

  const ticks: number[] = []
  for (let t = 0; t <= totalMs; t += interval) {
    ticks.push(t)
  }
  // Always include the final tick if it doesn't land exactly
  if (ticks[ticks.length - 1] < totalMs) {
    ticks.push(totalMs)
  }
  return ticks
}

interface TraceTimelineProps {
  onSwitchToInspector?: () => void
}

export function TraceTimeline({ onSwitchToInspector }: TraceTimelineProps) {
  const nodes = usePipelineStore((s) => s.nodes)
  const edges = usePipelineStore((s) => s.edges)
  const selectedNodeId = usePipelineStore((s) => s.selectedNodeId)
  const setSelectedNodeId = usePipelineStore((s) => s.setSelectedNodeId)

  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null)

  const handleBarClick = useCallback(
    (nodeId: string) => {
      setSelectedNodeId(nodeId)
      onSwitchToInspector?.()
    },
    [setSelectedNodeId, onSwitchToInspector]
  )

  // Build timeline rows from topological levels
  const { rows, totalMs } = useMemo(() => {
    const nodesWithExecution = nodes.filter((n) => n.data.execution)
    if (nodesWithExecution.length === 0) {
      return { rows: [], totalMs: 0 }
    }

    // Compute topological levels
    const nodeIds = nodes.map((n) => n.id)
    const edgeData = edges.map((e) => ({ source: e.source, target: e.target }))
    const levels = topologicalSort(nodeIds, edgeData)

    // Map nodeId -> level index
    const nodeLevelMap = new Map<string, number>()
    levels.forEach((level, idx) => {
      level.forEach((id) => nodeLevelMap.set(id, idx))
    })

    // Compute start times: level N starts at sum of max latencies of all prior levels
    const levelMaxLatency: number[] = levels.map((level) => {
      let max = 0
      for (const id of level) {
        const node = nodes.find((n) => n.id === id)
        const latency = node?.data.execution?.latencyMs ?? 0
        if (latency > max) max = latency
      }
      return max
    })

    const levelStartTime: number[] = []
    let cumulative = 0
    for (let i = 0; i < levels.length; i++) {
      levelStartTime.push(cumulative)
      cumulative += levelMaxLatency[i]
    }

    const totalMs = cumulative

    // Build rows in topological order
    const rows: TimelineRow[] = []
    for (let levelIdx = 0; levelIdx < levels.length; levelIdx++) {
      for (const nodeId of levels[levelIdx]) {
        const node = nodes.find((n) => n.id === nodeId)
        if (!node || !node.data.execution) continue

        const exec = node.data.execution
        const def = node.type ? NODE_REGISTRY[node.type] : null

        rows.push({
          nodeId,
          label: def?.label ?? node.type ?? 'Unknown',
          color: def?.color ?? '#71717a',
          status: exec.status,
          latencyMs: exec.latencyMs ?? 0,
          cost: exec.cost,
          startMs: levelStartTime[levelIdx],
          error: exec.error,
          skipReason: exec.skipReason,
        })
      }
    }

    return { rows, totalMs }
  }, [nodes, edges])

  // Empty state
  if (rows.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2 text-zinc-500">
        <Timer size={24} className="text-zinc-600" />
        <p className="text-sm">Timeline View</p>
        <p className="text-xs text-zinc-600">
          Run a query to see execution waterfall
        </p>
      </div>
    )
  }

  const ticks = computeTicks(totalMs)
  const LABEL_WIDTH = 140
  const CHART_MIN_WIDTH = 280

  return (
    <ScrollArea className="h-full">
      <div className="p-2">
        {/* Time axis header */}
        <div className="mb-1 flex" style={{ minWidth: LABEL_WIDTH + CHART_MIN_WIDTH }}>
          <div style={{ width: LABEL_WIDTH, minWidth: LABEL_WIDTH }} className="shrink-0" />
          <div className="relative flex-1" style={{ minWidth: CHART_MIN_WIDTH }}>
            {ticks.map((tick) => {
              const pct = totalMs > 0 ? (tick / totalMs) * 100 : 0
              return (
                <div
                  key={tick}
                  className="absolute top-0 flex flex-col items-center"
                  style={{ left: `${pct}%`, transform: 'translateX(-50%)' }}
                >
                  <span className="whitespace-nowrap text-[10px] text-zinc-500">
                    {formatLatency(tick)}
                  </span>
                  <div className="mt-0.5 h-1.5 w-px bg-zinc-600" />
                </div>
              )
            })}
            {/* Baseline */}
            <div className="absolute bottom-0 left-0 right-0 h-px bg-zinc-700" />
          </div>
        </div>

        {/* Spacer for tick labels */}
        <div className="h-5" />

        {/* Rows */}
        <div className="space-y-1">
          {rows.map((row) => {
            const isSelected = row.nodeId === selectedNodeId
            const isHovered = row.nodeId === hoveredNodeId
            const startPct = totalMs > 0 ? (row.startMs / totalMs) * 100 : 0
            const widthPct = totalMs > 0 ? (row.latencyMs / totalMs) * 100 : 0
            const isError = row.status === 'error'
            const isSkipped = row.status === 'skipped'
            const isRunning = row.status === 'running'
            const barColor = isError ? '#ef4444' : row.color

            return (
              <div
                key={row.nodeId}
                className="group relative flex items-center"
                style={{ minWidth: LABEL_WIDTH + CHART_MIN_WIDTH }}
              >
                {/* Node label */}
                <button
                  type="button"
                  onClick={() => handleBarClick(row.nodeId)}
                  className={`shrink-0 truncate rounded px-1.5 py-0.5 text-left text-[11px] transition-colors ${
                    isSelected
                      ? 'bg-zinc-700/60 text-zinc-200 ring-1 ring-zinc-600'
                      : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                  style={{ width: LABEL_WIDTH, minWidth: LABEL_WIDTH }}
                  title={row.label}
                >
                  {row.label}
                </button>

                {/* Chart area */}
                <div
                  className="relative flex-1"
                  style={{ minWidth: CHART_MIN_WIDTH, height: 22 }}
                >
                  {/* Background grid lines */}
                  {ticks.map((tick) => {
                    const pct = totalMs > 0 ? (tick / totalMs) * 100 : 0
                    return (
                      <div
                        key={tick}
                        className="absolute top-0 bottom-0 w-px bg-zinc-800"
                        style={{ left: `${pct}%` }}
                      />
                    )
                  })}

                  {/* Bar or dashed line */}
                  {isSkipped ? (
                    <div
                      className="absolute top-1/2 h-px -translate-y-1/2"
                      style={{
                        left: `${startPct}%`,
                        width: '40%',
                        backgroundImage:
                          'repeating-linear-gradient(90deg, #52525b 0px, #52525b 4px, transparent 4px, transparent 8px)',
                        backgroundSize: '8px 1px',
                      }}
                    />
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleBarClick(row.nodeId)}
                      onMouseEnter={() => setHoveredNodeId(row.nodeId)}
                      onMouseLeave={() => setHoveredNodeId(null)}
                      className="absolute top-1 bottom-1 rounded-sm transition-opacity"
                      style={{
                        left: `${startPct}%`,
                        width: `max(${widthPct}%, 4px)`,
                        backgroundColor: barColor,
                        opacity: isHovered || isSelected ? 1 : 0.8,
                        animation: isRunning
                          ? 'trace-pulse 1.5s ease-in-out infinite'
                          : undefined,
                      }}
                    >
                      {/* Latency label on bar (only if bar is wide enough) */}
                      {widthPct > 8 && (
                        <span className="absolute inset-0 flex items-center justify-center text-[10px] font-medium text-white drop-shadow-sm">
                          {formatLatency(row.latencyMs)}
                        </span>
                      )}
                    </button>
                  )}

                  {/* Latency label after bar (when bar is too narrow) */}
                  {!isSkipped && widthPct <= 8 && row.latencyMs > 0 && (
                    <span
                      className="absolute top-1/2 -translate-y-1/2 text-[10px] text-zinc-500"
                      style={{
                        left: `calc(${startPct + widthPct}% + 6px)`,
                      }}
                    >
                      {formatLatency(row.latencyMs)}
                    </span>
                  )}

                  {/* Skipped label */}
                  {isSkipped && (
                    <span
                      className="absolute top-1/2 -translate-y-1/2 text-[10px] italic text-zinc-600"
                      style={{
                        left: `calc(${startPct}% + 6px)`,
                      }}
                    >
                      skipped
                    </span>
                  )}

                  {/* Hover tooltip */}
                  {isHovered && !isSkipped && (
                    <div
                      className="pointer-events-none absolute z-50 rounded border border-zinc-700 bg-zinc-900 px-2.5 py-1.5 shadow-lg"
                      style={{
                        left: `${startPct + widthPct / 2}%`,
                        bottom: '100%',
                        transform: 'translateX(-50%)',
                        marginBottom: 4,
                      }}
                    >
                      <div className="flex flex-col gap-0.5 whitespace-nowrap text-[11px]">
                        <span className="font-medium text-zinc-200">{row.label}</span>
                        <div className="flex items-center gap-2">
                          <span
                            className="inline-block h-2 w-2 rounded-full"
                            style={{ backgroundColor: barColor }}
                          />
                          <span className="capitalize text-zinc-400">{row.status}</span>
                        </div>
                        {row.latencyMs > 0 && (
                          <span className="text-zinc-400">
                            Latency: {formatLatency(row.latencyMs)}
                          </span>
                        )}
                        {row.cost !== undefined && (
                          <span className="text-zinc-400">
                            Cost: ${row.cost.toFixed(4)}
                          </span>
                        )}
                        {row.error && (
                          <span className="max-w-48 truncate text-red-400">
                            {row.error}
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

    </ScrollArea>
  )
}
