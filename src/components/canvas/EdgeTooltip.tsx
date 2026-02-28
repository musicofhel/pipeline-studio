'use client'

import { useState, useCallback, useId } from 'react'
import {
  BaseEdge,
  EdgeLabelRenderer,
  type EdgeProps,
  type Edge,
  getSmoothStepPath,
} from '@xyflow/react'
import { X } from 'lucide-react'
import { PipelineEdgeData } from '@/types/nodes'
import { getHandleType } from '@/lib/engine/validator'
import { HANDLE_COLORS } from '@/lib/nodes/handle-colors'
import { usePipelineStore } from '@/lib/store/pipeline-store'

type TooltipEdgeType = Edge<PipelineEdgeData>

/**
 * Custom edge that extends AnimatedEdge behavior with a hover tooltip
 * showing the data type (HandleType) being transferred along the edge.
 * Uses React Flow's EdgeLabelRenderer for positioning.
 * Renders smooth step (right-angle with rounded corners) paths.
 * Shows route condition labels for conditional edges.
 * Shows a delete button when the edge is selected.
 */
export function TooltipEdge({
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
  selected,
}: EdgeProps<TooltipEdgeType>) {
  const [hovered, setHovered] = useState(false)
  const filterId = useId()

  // Determine the HandleType and color from the source handle
  const sourceNode = usePipelineStore((s) => s.nodes.find((n) => n.id === source))
  let handleTypeLabel = ''
  let handleColor = '#525252'
  if (sourceNode?.type && sourceHandleId) {
    const handleType = getHandleType(sourceNode.type, sourceHandleId, 'output')
    if (handleType) {
      handleTypeLabel = handleType
      handleColor = HANDLE_COLORS[handleType]
    }
  }

  const [edgePath, labelX, labelY] = getSmoothStepPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
    borderRadius: 8,
    offset: 30,
  })

  const isAnimated = data?.animated === true

  const handleMouseEnter = useCallback(() => setHovered(true), [])
  const handleMouseLeave = useCallback(() => setHovered(false), [])

  return (
    <>
      {/* Animated glow effects when data is flowing */}
      {isAnimated && (
        <>
          <defs>
            <filter id={`glow-${filterId}`} x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>
          <path
            d={edgePath}
            fill="none"
            stroke={handleColor}
            strokeWidth={4}
            strokeOpacity={0.2}
            filter={`url(#glow-${filterId})`}
          />
        </>
      )}

      {/* Main edge path */}
      <BaseEdge
        id={id}
        path={edgePath}
        markerEnd={markerEnd}
        style={{
          ...style,
          strokeWidth: 2,
          stroke: isAnimated ? handleColor : '#525252',
          opacity: isAnimated ? 0.7 : 1,
        }}
      />

      {/* Invisible wider hit area for hover detection */}
      <path
        d={edgePath}
        fill="none"
        stroke="transparent"
        strokeWidth={20}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        style={{ cursor: 'pointer' }}
      />

      {/* Traveling dot for animated edges */}
      {isAnimated && (
        <circle
          r={4}
          fill={handleColor}
          filter={`url(#glow-${filterId})`}
          style={{
            offsetPath: `path('${edgePath}')`,
            offsetDistance: '0%',
            animation: 'edge-flow-dot 600ms ease-in-out forwards',
          }}
        />
      )}

      {/* Route condition label for conditional edges */}
      {data?.condition?.route && (
        <EdgeLabelRenderer>
          <div
            style={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
              pointerEvents: 'all',
              zIndex: 60,
            }}
          >
            <div className="rounded-md border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[10px] font-medium text-amber-300 backdrop-blur-sm">
              {data.condition.route}
            </div>
          </div>
        </EdgeLabelRenderer>
      )}

      {/* Delete button when edge is selected */}
      {selected && (
        <EdgeLabelRenderer>
          <button
            onClick={(e) => {
              e.stopPropagation()
              const { edges, setEdges } = usePipelineStore.getState()
              setEdges(edges.filter((edge) => edge.id !== id))
            }}
            style={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${labelX}px,${labelY - 18}px)`,
              pointerEvents: 'all',
              zIndex: 60,
            }}
            className="flex h-5 w-5 items-center justify-center rounded-full border border-zinc-600 bg-zinc-800 text-zinc-400 transition-colors hover:border-red-500 hover:bg-red-500/20 hover:text-red-400"
          >
            <X size={10} />
          </button>
        </EdgeLabelRenderer>
      )}

      {/* Tooltip badge rendered in HTML overlay via EdgeLabelRenderer */}
      <EdgeLabelRenderer>
        <div
          className="edge-tooltip-badge"
          style={{
            position: 'absolute',
            transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
            pointerEvents: 'none',
            opacity: hovered && handleTypeLabel ? 1 : 0,
            transition: 'opacity 150ms ease-in-out',
          }}
        >
          <div
            style={{
              backgroundColor: handleColor + '20',
              borderColor: handleColor,
              color: handleColor,
            }}
            className="rounded-md border px-2 py-0.5 text-[10px] font-medium shadow-lg backdrop-blur-sm"
          >
            {handleTypeLabel}
          </div>
        </div>
      </EdgeLabelRenderer>
    </>
  )
}
