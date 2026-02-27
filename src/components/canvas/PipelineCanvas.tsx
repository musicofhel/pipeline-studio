'use client'

import { useCallback, useEffect, useRef } from 'react'
import {
  ReactFlow,
  Background,
  MiniMap,
  Controls,
  type Connection,
  type ReactFlowInstance,
  type NodeTypes,
  type EdgeTypes,
  BackgroundVariant,
  MarkerType,
  type DefaultEdgeOptions,
  type IsValidConnection,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { usePipelineStore, type PipelineNode, type PipelineEdge } from '@/lib/store/pipeline-store'
import { nodeTypesMap } from '@/lib/nodes/node-types-map'
import { isValidConnection } from '@/lib/engine/validator'
import { NODE_REGISTRY } from '@/lib/nodes/registry'
import { QueryBusEdge } from './QueryBusEdge'

const edgeTypes: EdgeTypes = {
  queryBus: QueryBusEdge,
}

const defaultEdgeOptions: DefaultEdgeOptions = {
  style: { strokeWidth: 2, stroke: '#525252' },
  markerEnd: { type: MarkerType.ArrowClosed, color: '#525252', width: 16, height: 16 },
}

export function PipelineCanvas() {
  const rfInstance = useRef<ReactFlowInstance<PipelineNode, PipelineEdge> | null>(null)
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

  const handlePaneClick = useCallback(() => {
    setSelectedNodeId(null)
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
    <div className="h-full w-full">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        isValidConnection={handleConnectionValidation}
        onPaneClick={handlePaneClick}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onInit={(instance) => { rfInstance.current = instance }}
        nodeTypes={nodeTypesMap as unknown as NodeTypes}
        edgeTypes={edgeTypes}
        defaultEdgeOptions={defaultEdgeOptions}
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
          maskColor="rgba(0,0,0,0.6)"
          pannable
          zoomable
        />
        <Controls className="!bg-zinc-800 !border-zinc-700 !shadow-lg [&>button]:!bg-zinc-800 [&>button]:!border-zinc-700 [&>button]:!text-zinc-300 [&>button:hover]:!bg-zinc-700" />
      </ReactFlow>
    </div>
  )
}
