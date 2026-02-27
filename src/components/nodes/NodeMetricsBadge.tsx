'use client'

import { memo } from 'react'
import { Clock, DollarSign } from 'lucide-react'
import { NodeExecutionData } from '@/types/nodes'

interface NodeMetricsBadgeProps {
  execution: NodeExecutionData | undefined
}

function formatLatency(ms: number): string {
  if (ms < 1000) return `${ms.toFixed(0)}ms`
  return `${(ms / 1000).toFixed(2)}s`
}

function formatCost(cost: number): string {
  if (cost < 0.01) return `$${cost.toFixed(4)}`
  return `$${cost.toFixed(3)}`
}

function NodeMetricsBadgeComponent({ execution }: NodeMetricsBadgeProps) {
  if (!execution) return null

  const isComplete = execution.status === 'success' || execution.status === 'error'
  if (!isComplete) return null

  const hasLatency = execution.latencyMs !== undefined
  const hasCost = execution.cost !== undefined && execution.cost > 0

  if (!hasLatency && !hasCost) return null

  return (
    <div className="flex items-center gap-1.5 pt-0.5">
      {hasLatency && (
        <span className="inline-flex items-center gap-0.5 rounded bg-zinc-800 px-1 py-px text-[9px] text-zinc-500">
          <Clock size={8} className="shrink-0" />
          {formatLatency(execution.latencyMs!)}
        </span>
      )}
      {hasCost && (
        <span className="inline-flex items-center gap-0.5 rounded bg-zinc-800 px-1 py-px text-[9px] text-zinc-500">
          <DollarSign size={8} className="shrink-0" />
          {formatCost(execution.cost!)}
        </span>
      )}
    </div>
  )
}

export const NodeMetricsBadge = memo(NodeMetricsBadgeComponent)
