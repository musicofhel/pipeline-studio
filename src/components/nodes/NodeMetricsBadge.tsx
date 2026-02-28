'use client'

import { memo } from 'react'
import { NodeExecutionData } from '@/types/nodes'

interface NodeMetricsBadgeProps {
  execution: NodeExecutionData | undefined
}

/**
 * Legacy metrics badge — latency/cost display has moved to NodeMetricsSection.
 * This component is kept as a minimal wrapper for backward compatibility.
 * Error text and skip reason rendering are now handled directly by BaseNode.
 */
function NodeMetricsBadgeComponent({ execution }: NodeMetricsBadgeProps) {
  if (!execution) return null

  const isComplete = execution.status === 'success' || execution.status === 'error'
  if (!isComplete) return null

  // Metrics rendering moved to NodeMetricsSection
  return null
}

export const NodeMetricsBadge = memo(NodeMetricsBadgeComponent)
