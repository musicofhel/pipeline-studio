'use client'

import { memo, useCallback, useMemo } from 'react'
import { Handle, Position, useConnection, type NodeProps } from '@xyflow/react'
import {
  ShieldAlert, Eye, ShieldCheck, ShieldBan, GitBranch, Expand,
  Database, Copy, ArrowUpDown, Minimize2, Route, Sparkles,
  CheckCircle, FileCheck, Activity, BarChart3, Send, MessageSquare,
  Loader2, Check, X, AlertTriangle, Ban, EyeOff,
} from 'lucide-react'
import { NODE_REGISTRY } from '@/lib/nodes/registry'
import { HANDLE_COLORS } from '@/lib/nodes/handle-colors'
import { HandleDefinition, HandleType, NodeStatus, PipelineNodeData } from '@/types/nodes'
import { usePipelineStore } from '@/lib/store/pipeline-store'
import { useUIStore } from '@/lib/store/ui-store'
import { NodeMetricsBadge } from '@/components/nodes/NodeMetricsBadge'

const ICON_MAP: Record<string, React.ComponentType<{ size?: number; className?: string; style?: React.CSSProperties }>> = {
  ShieldAlert, Eye, ShieldCheck, ShieldBan, GitBranch, Expand,
  Database, Copy, ArrowUpDown, Minimize2, Route, Sparkles,
  CheckCircle, FileCheck, Activity, BarChart3, Send, MessageSquare,
}

const STATUS_CONFIG: Record<NodeStatus, { borderColor: string; icon: React.ReactNode; label: string }> = {
  idle: { borderColor: 'border-zinc-600', icon: null, label: '' },
  running: { borderColor: 'border-yellow-400', icon: <Loader2 size={14} className="animate-spin text-yellow-400" />, label: 'Running' },
  success: { borderColor: 'border-green-400', icon: <Check size={14} className="text-green-400" />, label: 'Success' },
  error: { borderColor: 'border-red-500', icon: <X size={14} className="text-red-500" />, label: 'Error' },
  blocked: { borderColor: 'border-orange-500', icon: <Ban size={14} className="text-orange-500" />, label: 'Blocked' },
  skipped: { borderColor: 'border-zinc-500', icon: <EyeOff size={14} className="text-zinc-400" />, label: 'Skipped' },
  disabled: { borderColor: 'border-zinc-700', icon: <EyeOff size={14} className="text-zinc-600" />, label: 'Disabled' },
}

function positionToReactFlow(pos: HandleDefinition['position']): Position {
  switch (pos) {
    case 'left': return Position.Left
    case 'right': return Position.Right
    case 'top': return Position.Top
    case 'bottom': return Position.Bottom
  }
}

/**
 * Determine the CSS class for a handle based on the active connection drag state.
 * - If no drag is in progress, returns '' (no extra class).
 * - If the drag source handle type matches this handle's type AND this handle is a
 *   valid target (opposite direction), returns 'connecting-valid'.
 * - Otherwise returns 'connecting-invalid'.
 */
function getHandleConnectionClass(
  handle: HandleDefinition,
  handleDirection: 'input' | 'output',
  nodeId: string,
  connectionFromNodeId: string | undefined,
  connectionFromHandleType: HandleType | null,
  connectionFromDirection: 'source' | 'target' | undefined,
  isConnecting: boolean,
): string {
  if (!isConnecting || !connectionFromHandleType || !connectionFromDirection) return ''
  // Don't highlight handles on the source node itself
  if (nodeId === connectionFromNodeId) return ''
  // A source handle drag needs a target handle, and vice versa
  const needsTarget = connectionFromDirection === 'source'
  if (needsTarget && handleDirection !== 'input') return 'connecting-invalid'
  if (!needsTarget && handleDirection !== 'output') return 'connecting-invalid'
  // Type compatibility check
  if (handle.type === connectionFromHandleType) return 'connecting-valid'
  return 'connecting-invalid'
}

function BaseNodeComponent({ id, type, selected }: NodeProps) {
  const nodeType = type as string
  const def = NODE_REGISTRY[nodeType]
  const setSelectedNodeId = usePipelineStore((s) => s.setSelectedNodeId)
  const setConfigPanelOpen = useUIStore((s) => s.setConfigPanelOpen)

  // Detect active connection drag via useConnection hook
  const connection = useConnection()

  // Derive the HandleType of the source handle being dragged
  const connectionInfo = useMemo(() => {
    if (!connection.inProgress || !connection.fromHandle) {
      return { isConnecting: false, fromHandleType: null as HandleType | null, fromNodeId: undefined as string | undefined, fromDirection: undefined as 'source' | 'target' | undefined }
    }
    const fromNodeId = connection.fromNode?.internals?.userNode?.id ?? connection.fromHandle.nodeId
    const fromNodeType = connection.fromNode?.internals?.userNode?.type as string | undefined
    const fromHandleId = connection.fromHandle.id
    const fromDirection = connection.fromHandle.type // 'source' or 'target'

    let fromHandleType: HandleType | null = null
    if (fromNodeType && fromHandleId) {
      const fromDef = NODE_REGISTRY[fromNodeType]
      if (fromDef) {
        const handles = fromDirection === 'source' ? fromDef.outputs : fromDef.inputs
        const h = handles.find((h) => h.id === fromHandleId)
        if (h) fromHandleType = h.type
      }
    }
    return { isConnecting: true, fromHandleType, fromNodeId, fromDirection }
  }, [connection.inProgress, connection.fromHandle, connection.fromNode])

  // Get execution data from the store
  const execution = usePipelineStore((s) => {
    const node = s.nodes.find((n) => n.id === id)
    return node?.data?.execution
  })

  const status: NodeStatus = execution?.status ?? 'idle'
  const statusCfg = STATUS_CONFIG[status]
  const IconComponent = def ? ICON_MAP[def.icon] : null

  const handleClick = useCallback(() => {
    setSelectedNodeId(id)
    setConfigPanelOpen(true)
  }, [id, setSelectedNodeId, setConfigPanelOpen])

  if (!def) {
    return <div className="rounded bg-red-900 p-2 text-xs text-red-300">Unknown: {nodeType}</div>
  }

  const isSkippedOrDisabled = status === 'skipped' || status === 'disabled'

  // Calculate handle positions — distribute evenly along the edge
  const leftHandles = def.inputs.filter((h) => h.position === 'left')
  const rightHandles = def.outputs.filter((h) => h.position === 'right')
  const topHandles = [...def.inputs.filter((h) => h.position === 'top'), ...def.outputs.filter((h) => h.position === 'top')]
  const bottomHandles = [...def.inputs.filter((h) => h.position === 'bottom'), ...def.outputs.filter((h) => h.position === 'bottom')]

  return (
    <div
      className={`
        group relative rounded-lg border-2 bg-zinc-900 shadow-lg transition-all
        ${statusCfg.borderColor}
        ${selected ? 'ring-2 ring-blue-500 ring-offset-1 ring-offset-zinc-950' : ''}
        ${isSkippedOrDisabled ? 'opacity-50' : ''}
        ${status === 'running' ? 'shadow-yellow-400/20' : ''}
      `}
      style={{ minWidth: 220 }}
      onClick={handleClick}
    >
      {/* Header */}
      <div
        className="flex items-center gap-2 rounded-t-md px-3 py-2"
        style={{ backgroundColor: def.color + '20' }}
      >
        {IconComponent && (
          <IconComponent size={16} className="shrink-0" style={{ color: def.color }} />
        )}
        <span className="truncate text-sm font-medium text-zinc-100">
          {def.label}
        </span>
        {statusCfg.icon && <span className="ml-auto shrink-0">{statusCfg.icon}</span>}
      </div>

      {/* Handles section */}
      <div className="flex justify-between gap-4 px-3 py-2">
        {/* Left inputs */}
        <div className="flex flex-col gap-1.5">
          {leftHandles.map((h) => {
            const connClass = getHandleConnectionClass(h, 'input', id, connectionInfo.fromNodeId, connectionInfo.fromHandleType, connectionInfo.fromDirection, connectionInfo.isConnecting)
            return (
              <div key={h.id} className="relative flex items-center gap-1.5">
                <Handle
                  type="target"
                  position={Position.Left}
                  id={h.id}
                  className={`!h-2.5 !w-2.5 !rounded-full !border-2 !border-zinc-800 ${connClass}`}
                  style={{
                    backgroundColor: HANDLE_COLORS[h.type],
                    top: 'auto',
                    position: 'relative',
                    transform: 'none',
                    left: -12,
                  }}
                />
                <span className="text-[10px] text-zinc-400">{h.label}</span>
              </div>
            )
          })}
        </div>

        {/* Right outputs */}
        <div className="flex flex-col items-end gap-1.5">
          {rightHandles.map((h) => {
            const connClass = getHandleConnectionClass(h, 'output', id, connectionInfo.fromNodeId, connectionInfo.fromHandleType, connectionInfo.fromDirection, connectionInfo.isConnecting)
            return (
              <div key={h.id} className="relative flex items-center gap-1.5">
                <span className="text-[10px] text-zinc-400">{h.label}</span>
                <Handle
                  type="source"
                  position={Position.Right}
                  id={h.id}
                  className={`!h-2.5 !w-2.5 !rounded-full !border-2 !border-zinc-800 ${connClass}`}
                  style={{
                    backgroundColor: HANDLE_COLORS[h.type],
                    top: 'auto',
                    position: 'relative',
                    transform: 'none',
                    right: -12,
                  }}
                />
              </div>
            )
          })}
        </div>
      </div>

      {/* Top handles */}
      {topHandles.map((h, i) => {
        const dir = def.inputs.some((inp) => inp.id === h.id) ? 'input' as const : 'output' as const
        const connClass = getHandleConnectionClass(h, dir, id, connectionInfo.fromNodeId, connectionInfo.fromHandleType, connectionInfo.fromDirection, connectionInfo.isConnecting)
        return (
          <Handle
            key={h.id}
            type={dir === 'input' ? 'target' : 'source'}
            position={Position.Top}
            id={h.id}
            className={`!h-2.5 !w-2.5 !rounded-full !border-2 !border-zinc-800 ${connClass}`}
            style={{
              backgroundColor: HANDLE_COLORS[h.type],
              left: `${((i + 1) / (topHandles.length + 1)) * 100}%`,
            }}
          />
        )
      })}

      {/* Bottom handles */}
      {bottomHandles.map((h, i) => {
        const dir = def.inputs.some((inp) => inp.id === h.id) ? 'input' as const : 'output' as const
        const connClass = getHandleConnectionClass(h, dir, id, connectionInfo.fromNodeId, connectionInfo.fromHandleType, connectionInfo.fromDirection, connectionInfo.isConnecting)
        return (
          <Handle
            key={h.id}
            type={dir === 'input' ? 'target' : 'source'}
            position={Position.Bottom}
            id={h.id}
            className={`!h-2.5 !w-2.5 !rounded-full !border-2 !border-zinc-800 ${connClass}`}
            style={{
              backgroundColor: HANDLE_COLORS[h.type],
              left: `${((i + 1) / (bottomHandles.length + 1)) * 100}%`,
            }}
          />
        )
      })}

      {/* Footer — execution stats */}
      {(execution?.latencyMs !== undefined || execution?.error || execution?.skipReason) && (
        <div className="border-t border-zinc-700 px-3 py-1.5">
          <div className="flex items-center justify-between text-[10px]">
            {execution.error && (
              <span className="truncate text-red-400" title={execution.error}>
                {execution.error}
              </span>
            )}
            {execution.skipReason && (
              <span className="truncate text-zinc-500" title={execution.skipReason}>
                {execution.skipReason}
              </span>
            )}
          </div>
          {/* Metric badges — latency + cost */}
          <NodeMetricsBadge execution={execution} />
        </div>
      )}

      {/* Service indicator */}
      {def.requiresApiKey && (
        <div className="absolute -right-1 -top-1 h-2 w-2 rounded-full bg-amber-500" title={`Requires ${def.requiresApiKey}`} />
      )}
    </div>
  )
}

export const BaseNode = memo(BaseNodeComponent)
