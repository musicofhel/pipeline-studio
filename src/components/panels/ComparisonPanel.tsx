'use client'

import { useState, useMemo } from 'react'
import { ArrowDown, ArrowUp, Minus, Clock, DollarSign, GitBranch, MessageSquare } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { usePipelineStore } from '@/lib/store/pipeline-store'

function formatLatency(ms: number | undefined): string {
  if (ms === undefined) return '--'
  return ms < 1000 ? `${ms.toFixed(0)}ms` : `${(ms / 1000).toFixed(2)}s`
}

function formatCost(cost: number | undefined): string {
  if (cost === undefined) return '--'
  return `$${cost.toFixed(4)}`
}

function percentDiff(a: number | undefined, b: number | undefined): { value: string; direction: 'up' | 'down' | 'same' } {
  if (a === undefined || b === undefined || b === 0) return { value: '--', direction: 'same' }
  const diff = ((a - b) / b) * 100
  if (Math.abs(diff) < 0.5) return { value: '0%', direction: 'same' }
  return {
    value: `${Math.abs(diff).toFixed(1)}%`,
    direction: diff > 0 ? 'up' : 'down',
  }
}

function DiffBadge({ diff, lowerIsBetter = true }: { diff: { value: string; direction: 'up' | 'down' | 'same' }; lowerIsBetter?: boolean }) {
  if (diff.direction === 'same') {
    return (
      <span className="flex items-center gap-0.5 text-xs text-zinc-500">
        <Minus size={10} />
        {diff.value}
      </span>
    )
  }

  const isGood = lowerIsBetter ? diff.direction === 'down' : diff.direction === 'up'

  return (
    <span className={`flex items-center gap-0.5 text-xs ${isGood ? 'text-green-400' : 'text-red-400'}`}>
      {diff.direction === 'up' ? <ArrowUp size={10} /> : <ArrowDown size={10} />}
      {diff.value}
    </span>
  )
}

function formatTimestamp(ts: number): string {
  return new Date(ts).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
}

export function ComparisonPanel() {
  const executionRuns = usePipelineStore((s) => s.executionRuns)
  const completedRuns = useMemo(
    () => executionRuns.filter((r) => r.status === 'completed'),
    [executionRuns]
  )

  const [runAId, setRunAId] = useState<string>('')
  const [runBId, setRunBId] = useState<string>('')

  const runA = completedRuns.find((r) => r.id === runAId)
  const runB = completedRuns.find((r) => r.id === runBId)

  const latencyDiff = useMemo(
    () => percentDiff(runA?.totalLatencyMs, runB?.totalLatencyMs),
    [runA?.totalLatencyMs, runB?.totalLatencyMs]
  )

  const costDiff = useMemo(
    () => percentDiff(runA?.totalCost, runB?.totalCost),
    [runA?.totalCost, runB?.totalCost]
  )

  if (completedRuns.length < 2) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-zinc-500">
        Run at least two queries to compare results
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col">
      {/* Selectors */}
      <div className="flex items-center gap-3 border-b border-zinc-700 px-3 py-2">
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="border-blue-500/50 text-blue-400">
            A
          </Badge>
          <Select value={runAId} onValueChange={setRunAId}>
            <SelectTrigger
              size="sm"
              className="h-7 w-[200px] border-zinc-700 bg-zinc-800 px-2 text-xs text-zinc-300"
            >
              <SelectValue placeholder="Select Run A" />
            </SelectTrigger>
            <SelectContent className="border-zinc-700 bg-zinc-800">
              {completedRuns.map((run) => (
                <SelectItem
                  key={run.id}
                  value={run.id}
                  className="text-xs text-zinc-300"
                  disabled={run.id === runBId}
                >
                  {formatTimestamp(run.startTime)} - {run.query.slice(0, 30)}
                  {run.query.length > 30 ? '...' : ''}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <span className="text-xs text-zinc-600">vs</span>

        <div className="flex items-center gap-2">
          <Badge variant="outline" className="border-amber-500/50 text-amber-400">
            B
          </Badge>
          <Select value={runBId} onValueChange={setRunBId}>
            <SelectTrigger
              size="sm"
              className="h-7 w-[200px] border-zinc-700 bg-zinc-800 px-2 text-xs text-zinc-300"
            >
              <SelectValue placeholder="Select Run B" />
            </SelectTrigger>
            <SelectContent className="border-zinc-700 bg-zinc-800">
              {completedRuns.map((run) => (
                <SelectItem
                  key={run.id}
                  value={run.id}
                  className="text-xs text-zinc-300"
                  disabled={run.id === runAId}
                >
                  {formatTimestamp(run.startTime)} - {run.query.slice(0, 30)}
                  {run.query.length > 30 ? '...' : ''}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Comparison content */}
      {runA && runB ? (
        <ScrollArea className="flex-1">
          <div className="p-3">
            {/* Summary metrics */}
            <div className="grid grid-cols-3 gap-3">
              {/* Latency */}
              <div className="rounded-md border border-zinc-700/50 bg-zinc-800/50 p-2.5">
                <div className="mb-2 flex items-center gap-1.5 text-xs text-zinc-500">
                  <Clock size={12} />
                  Total Latency
                </div>
                <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
                  <div>
                    <div className="text-[10px] text-blue-400">Run A</div>
                    <div className="text-sm font-medium text-zinc-200">
                      {formatLatency(runA.totalLatencyMs)}
                    </div>
                  </div>
                  <DiffBadge diff={latencyDiff} lowerIsBetter />
                  <div className="text-right">
                    <div className="text-[10px] text-amber-400">Run B</div>
                    <div className="text-sm font-medium text-zinc-200">
                      {formatLatency(runB.totalLatencyMs)}
                    </div>
                  </div>
                </div>
              </div>

              {/* Cost */}
              <div className="rounded-md border border-zinc-700/50 bg-zinc-800/50 p-2.5">
                <div className="mb-2 flex items-center gap-1.5 text-xs text-zinc-500">
                  <DollarSign size={12} />
                  Total Cost
                </div>
                <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
                  <div>
                    <div className="text-[10px] text-blue-400">Run A</div>
                    <div className="text-sm font-medium text-zinc-200">
                      {formatCost(runA.totalCost)}
                    </div>
                  </div>
                  <DiffBadge diff={costDiff} lowerIsBetter />
                  <div className="text-right">
                    <div className="text-[10px] text-amber-400">Run B</div>
                    <div className="text-sm font-medium text-zinc-200">
                      {formatCost(runB.totalCost)}
                    </div>
                  </div>
                </div>
              </div>

              {/* Route */}
              <div className="rounded-md border border-zinc-700/50 bg-zinc-800/50 p-2.5">
                <div className="mb-2 flex items-center gap-1.5 text-xs text-zinc-500">
                  <GitBranch size={12} />
                  Route Used
                </div>
                <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
                  <div>
                    <div className="text-[10px] text-blue-400">Run A</div>
                    <div className="truncate text-sm font-medium text-zinc-200">
                      {runA.route ?? '--'}
                    </div>
                  </div>
                  <span className="text-xs text-zinc-600">
                    {runA.route === runB.route ? '=' : '!='}
                  </span>
                  <div className="text-right">
                    <div className="text-[10px] text-amber-400">Run B</div>
                    <div className="truncate text-sm font-medium text-zinc-200">
                      {runB.route ?? '--'}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Response comparison */}
            <div className="mt-3">
              <div className="mb-2 flex items-center gap-1.5 text-xs text-zinc-500">
                <MessageSquare size={12} />
                Response Text
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="rounded-md border border-zinc-700/50 bg-zinc-800/50 p-2.5">
                  <div className="mb-1 text-[10px] text-blue-400">Run A</div>
                  <p className="text-xs leading-relaxed text-zinc-300">
                    {runA.response
                      ? runA.response.length > 300
                        ? `${runA.response.slice(0, 300)}...`
                        : runA.response
                      : '--'}
                  </p>
                </div>
                <div className="rounded-md border border-zinc-700/50 bg-zinc-800/50 p-2.5">
                  <div className="mb-1 text-[10px] text-amber-400">Run B</div>
                  <p className="text-xs leading-relaxed text-zinc-300">
                    {runB.response
                      ? runB.response.length > 300
                        ? `${runB.response.slice(0, 300)}...`
                        : runB.response
                      : '--'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </ScrollArea>
      ) : (
        <div className="flex flex-1 items-center justify-center text-sm text-zinc-500">
          Select two runs above to compare
        </div>
      )}
    </div>
  )
}
