'use client'

import { useCallback, useRef, useState } from 'react'
import {
  ReactFlow,
  Background,
  MiniMap,
  Controls,
  type Connection,
  type ReactFlowInstance,
  type NodeTypes,
  type EdgeTypes,
  type ConnectionLineComponentProps,
  BackgroundVariant,
  MarkerType,
  getSmoothStepPath,
  type DefaultEdgeOptions,
  type IsValidConnection,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { usePipelineStore, type PipelineNode, type PipelineEdge } from '@/lib/store/pipeline-store'
import { nodeTypesMap } from '@/lib/nodes/node-types-map'
import { isValidConnection, getHandleType } from '@/lib/engine/validator'
import { NODE_REGISTRY } from '@/lib/nodes/registry'
import { HANDLE_COLORS } from '@/lib/nodes/handle-colors'
import type { NodeStatus } from '@/types/nodes'
import { QueryBusEdge } from './QueryBusEdge'
import { TooltipEdge } from './EdgeTooltip'
import { ExecutionOverlay } from './ExecutionOverlay'
import { NodeContextMenu, type ContextMenuState } from './NodeContextMenu'

const edgeTypes: EdgeTypes = {
  default: TooltipEdge,
  queryBus: QueryBusEdge,
}

const defaultEdgeOptions: DefaultEdgeOptions = {
  style: { strokeWidth: 2, stroke: '#525252' },
  markerEnd: { type: MarkerType.ArrowClosed, color: '#525252', width: 16, height: 16 },
}

// --- Task 2: MiniMap node colors ---

/** Status-based colors for minimap nodes during execution */
const EXECUTION_STATUS_COLORS: Record<NodeStatus, string> = {
  idle: '#52525b',    // zinc-600
  running: '#eab308', // yellow-500
  success: '#22c55e', // green-500
  error: '#ef4444',   // red-500
  blocked: '#f97316', // orange-500
  skipped: '#71717a', // zinc-500
  disabled: '#3f3f46', // zinc-700
}

/**
 * Returns the fill color for a minimap node.
 * During execution, nodes are colored by their execution status.
 * Otherwise, they are colored by their category color from the registry.
 */
function getMinimapNodeColor(node: PipelineNode): string {
  const executionStatus = node.data?.execution?.status
  if (executionStatus && executionStatus !== 'idle') {
    return EXECUTION_STATUS_COLORS[executionStatus]
  }
  const def = node.type ? NODE_REGISTRY[node.type] : null
  return def?.color ?? '#52525b'
}

/**
 * Returns the stroke color for minimap nodes (slightly brighter version of fill).
 */
function getMinimapNodeStrokeColor(node: PipelineNode): string {
  const executionStatus = node.data?.execution?.status
  if (executionStatus && executionStatus !== 'idle') {
    return EXECUTION_STATUS_COLORS[executionStatus]
  }
  return 'transparent'
}

// --- Task 4: Custom connection line ---

/**
 * Custom connection line component that renders a colored dashed line
 * matching the source handle type color. Shows green/red based on
 * connection validity status.
 */
function CustomConnectionLine({
  fromX,
  fromY,
  toX,
  toY,
  fromPosition,
  toPosition,
  fromNode,
  fromHandle,
  connectionStatus,
}: ConnectionLineComponentProps) {
  // Determine color from the source handle type
  let lineColor = '#525252'
  const nodeType = fromNode?.internals?.userNode?.type as string | undefined
  const handleId = fromHandle?.id
  if (nodeType && handleId) {
    const handleType = getHandleType(nodeType, handleId, fromHandle.type === 'source' ? 'output' : 'input')
    if (handleType) {
      lineColor = HANDLE_COLORS[handleType]
    }
  }

  // Override color based on connection validity
  if (connectionStatus === 'valid') {
    lineColor = '#22c55e' // green
  } else if (connectionStatus === 'invalid') {
    lineColor = '#ef4444' // red
  }

  const [path] = getSmoothStepPath({
    sourceX: fromX,
    sourceY: fromY,
    sourcePosition: fromPosition,
    targetX: toX,
    targetY: toY,
    targetPosition: toPosition,
    borderRadius: 8,
    offset: 30,
  })

  return (
    <g>
      {/* Glow behind the connection line */}
      <path
        d={path}
        fill="none"
        stroke={lineColor}
        strokeWidth={4}
        strokeOpacity={0.15}
      />
      {/* Dashed connection line */}
      <path
        d={path}
        fill="none"
        stroke={lineColor}
        strokeWidth={2}
        strokeDasharray="8 4"
        strokeLinecap="round"
        className="animated-connection-line"
      />
      {/* End circle indicator */}
      <circle
        cx={toX}
        cy={toY}
        r={4}
        fill={lineColor}
        fillOpacity={0.5}
        stroke={lineColor}
        strokeWidth={1.5}
      />
    </g>
  )
}

export function PipelineCanvas() {
  const rfInstance = useRef<ReactFlowInstance<PipelineNode, PipelineEdge> | null>(null)
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null)
  const nodes = usePipelineStore((s) => s.nodes)
  const edges = usePipelineStore((s) => s.edges)
  const onNodesChange = usePipelineStore((s) => s.onNodesChange)
  const onEdgesChange = usePipelineStore((s) => s.onEdgesChange)
  const onConnect = usePipelineStore((s) => s.onConnect)
  const setSelectedNodeId = usePipelineStore((s) => s.setSelectedNodeId)
  const addNode = usePipelineStore((s) => s.addNode)

  const handleConnectionValidation: IsValidConnection<PipelineEdge> = useCallback(
    (connection) => {
      // Extract Connection-like fields from the edge-or-connection union
      const conn: Connection = {
        source: connection.source,
        target: connection.target,
        sourceHandle: connection.sourceHandle ?? null,
        targetHandle: connection.targetHandle ?? null,
      }
      return isValidConnection(conn, nodes)
    },
    [nodes]
  )

  const handleNodeContextMenu = useCallback(
    (event: React.MouseEvent, node: PipelineNode) => {
      event.preventDefault()
      setContextMenu({ nodeId: node.id, x: event.clientX, y: event.clientY })
    },
    []
  )

  const closeContextMenu = useCallback(() => {
    setContextMenu(null)
  }, [])

  const handlePaneClick = useCallback(() => {
    setSelectedNodeId(null)
    setContextMenu(null)
  }, [setSelectedNodeId])

  const handleDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault()
    event.dataTransfer.dropEffect = 'move'
  }, [])

  const handleDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault()
      const nodeType = event.dataTransfer.getData('application/pipeline-node')
      if (!nodeType || !NODE_REGISTRY[nodeType]) return

      const position = rfInstance.current?.screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      })
      if (!position) return

      const def = NODE_REGISTRY[nodeType]
      const newNode: PipelineNode = {
        id: `${nodeType}-${Date.now()}`,
        type: nodeType,
        position,
        data: { config: { ...def.defaultConfig } },
      }
      addNode(newNode)
    },
    [addNode]
  )

  return (
    <div className="relative h-full w-full [&_.react-flow__edges]:!z-0 [&_.react-flow__node]:!z-[21] [&_.react-flow__handle]:!z-[30] [&_.react-flow__edgelabel-renderer]:!z-[60]">
      <ExecutionOverlay />
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        isValidConnection={handleConnectionValidation}
        onNodeContextMenu={handleNodeContextMenu}
        onPaneClick={handlePaneClick}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onInit={(instance) => { rfInstance.current = instance }}
        nodeTypes={nodeTypesMap as unknown as NodeTypes}
        edgeTypes={edgeTypes}
        defaultEdgeOptions={defaultEdgeOptions}
        connectionLineComponent={CustomConnectionLine}
        elevateEdgesOnSelect
        fitView
        fitViewOptions={{ padding: 0.1, maxZoom: 1 }}
        colorMode="dark"
        proOptions={{ hideAttribution: true }}
        deleteKeyCode={['Delete', 'Backspace']}
        multiSelectionKeyCode="Shift"
        snapToGrid
        snapGrid={[20, 20]}
      >
        <Background variant={BackgroundVariant.Dots} gap={20} size={1} color="#333" />
        <MiniMap
          className="!bg-zinc-900 !border-zinc-700"
          nodeStrokeWidth={3}
          nodeColor={getMinimapNodeColor}
          nodeStrokeColor={getMinimapNodeStrokeColor}
          maskColor="rgba(0,0,0,0.6)"
          pannable
          zoomable
        />
        <Controls className="!bg-zinc-800 !border-zinc-700 !shadow-lg [&>button]:!bg-zinc-800 [&>button]:!border-zinc-700 [&>button]:!text-zinc-300 [&>button:hover]:!bg-zinc-700" />
      </ReactFlow>
      {contextMenu && (
        <NodeContextMenu menu={contextMenu} onClose={closeContextMenu} />
      )}
    </div>
  )
}
