'use client'

import { memo } from 'react'
import { Clock, DollarSign } from 'lucide-react'
import { NodeDefinition, NodeExecutionData } from '@/types/nodes'

interface NodeMetricsSectionProps {
  def: NodeDefinition
  execution?: NodeExecutionData
}

function formatLatency(ms: number): string {
  if (ms < 1000) return `${ms.toFixed(0)}ms`
  return `${(ms / 1000).toFixed(2)}s`
}

function formatCost(cost: number): string {
  if (cost < 0.01) return `$${cost.toFixed(4)}`
  return `$${cost.toFixed(3)}`
}

function getLatencyDeltaColor(estimated: number, actual: number): string {
  if (actual < estimated) return 'text-green-400'
  if (actual > estimated * 1.2) return 'text-red-400'
  return 'text-zinc-300'
}

function getCostDeltaColor(estimated: number, actual: number): string {
  if (actual < estimated) return 'text-green-400'
  if (actual > estimated * 1.2) return 'text-red-400'
  return 'text-zinc-300'
}

function NodeMetricsSectionComponent({ def, execution }: NodeMetricsSectionProps) {
  const hasEstimatedLatency = def.estimatedLatencyMs !== undefined
  const hasEstimatedCost = def.estimatedCostPerCall !== undefined

  if (!hasEstimatedLatency && !hasEstimatedCost) return null

  const isComplete = execution?.status === 'success' || execution?.status === 'error'
  const hasActualLatency = isComplete && execution?.latencyMs !== undefined
  const hasActualCost = isComplete && execution?.cost !== undefined && execution.cost > 0

  return (
    <div className="flex items-center gap-3 border-t border-zinc-800 px-3 py-1.5">
      {hasEstimatedLatency && (
        <span className="inline-flex items-center gap-1 text-[10px]">
          <Clock size={8} className="shrink-0 text-zinc-500" />
          {hasActualLatency ? (
            <>
              <span className="text-zinc-600 line-through">
                ~{formatLatency(def.estimatedLatencyMs!)}
              </span>
              <span className={getLatencyDeltaColor(def.estimatedLatencyMs!, execution!.latencyMs!)}>
                {formatLatency(execution!.latencyMs!)}
              </span>
            </>
          ) : (
            <span className="text-zinc-400">~{formatLatency(def.estimatedLatencyMs!)}</span>
          )}
        </span>
      )}
      {hasEstimatedCost && (
        <span className="inline-flex items-center gap-1 text-[10px]">
          <DollarSign size={8} className="shrink-0 text-zinc-500" />
          {hasActualCost ? (
            <>
              <span className="text-zinc-600 line-through">
                ~{formatCost(def.estimatedCostPerCall!)}
              </span>
              <span className={getCostDeltaColor(def.estimatedCostPerCall!, execution!.cost!)}>
                {formatCost(execution!.cost!)}
              </span>
            </>
          ) : (
            <span className="text-zinc-400">~{formatCost(def.estimatedCostPerCall!)}</span>
          )}
        </span>
      )}
    </div>
  )
}

export const NodeMetricsSection = memo(NodeMetricsSectionComponent)
