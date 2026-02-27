'use client'

import { BaseEdge, type EdgeProps, getBezierPath, MarkerType } from '@xyflow/react'

export function QueryBusEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style = {},
  markerEnd,
}: EdgeProps) {
  const [edgePath] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  })

  return (
    <BaseEdge
      id={id}
      path={edgePath}
      markerEnd={markerEnd}
      style={{
        ...style,
        strokeWidth: 1.5,
        stroke: '#6366f1',
        strokeDasharray: '6 3',
        opacity: 0.5,
      }}
    />
  )
}
