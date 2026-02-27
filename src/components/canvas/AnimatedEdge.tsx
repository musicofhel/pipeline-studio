'use client'

import { useId } from 'react'
import {
  BaseEdge,
  type EdgeProps,
  type Edge,
  getBezierPath,
} from '@xyflow/react'
import { PipelineEdgeData } from '@/types/nodes'
import { getHandleType } from '@/lib/engine/validator'
import { HANDLE_COLORS } from '@/lib/nodes/handle-colors'
import { usePipelineStore } from '@/lib/store/pipeline-store'

type AnimatedEdgeType = Edge<PipelineEdgeData>

/**
 * Custom edge component that shows a traveling glowing dot along the path
 * when data.animated is true (i.e., data is flowing from a completed node).
 * Otherwise, renders as a standard smooth bezier edge.
 */
export function AnimatedEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style = {},
  markerEnd,
  source,
  sourceHandleId,
  data,
}: EdgeProps<AnimatedEdgeType>) {
  const filterId = useId()

  // Determine dot color from the source handle's HandleType
  const sourceNode = usePipelineStore((s) => s.nodes.find((n) => n.id === source))
  let dotColor = '#525252'
  if (sourceNode?.type && sourceHandleId) {
    const handleType = getHandleType(sourceNode.type, sourceHandleId, 'output')
    if (handleType) {
      dotColor = HANDLE_COLORS[handleType]
    }
  }

  const [edgePath] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  })

  const isAnimated = data?.animated === true

  if (!isAnimated) {
    return (
      <BaseEdge
        id={id}
        path={edgePath}
        markerEnd={markerEnd}
        style={{
          ...style,
          strokeWidth: 2,
          stroke: '#525252',
        }}
      />
    )
  }

  // Animated state: glowing stroke + traveling dot
  return (
    <>
      {/* SVG filter for the glow effect */}
      <defs>
        <filter id={`glow-${filterId}`} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Glow layer underneath */}
      <path
        d={edgePath}
        fill="none"
        stroke={dotColor}
        strokeWidth={4}
        strokeOpacity={0.2}
        filter={`url(#glow-${filterId})`}
      />

      {/* Main edge path */}
      <BaseEdge
        id={id}
        path={edgePath}
        markerEnd={markerEnd}
        style={{
          ...style,
          strokeWidth: 2,
          stroke: dotColor,
          opacity: 0.7,
        }}
      />

      {/* Traveling dot using offset-path animation */}
      <circle
        r={4}
        fill={dotColor}
        filter={`url(#glow-${filterId})`}
        style={{
          offsetPath: `path('${edgePath}')`,
          offsetDistance: '0%',
          animation: 'edge-flow-dot 600ms ease-in-out forwards',
        }}
      />
    </>
  )
}
