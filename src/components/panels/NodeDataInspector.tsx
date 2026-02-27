'use client'

import { useState } from 'react'
import { ChevronRight, ChevronDown, AlertCircle, CheckCircle, SkipForward, Clock } from 'lucide-react'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import { usePipelineStore } from '@/lib/store/pipeline-store'
import { NODE_REGISTRY } from '@/lib/nodes/registry'
import type { NodeExecutionData } from '@/types/nodes'

interface NodeDataInspectorProps {
  nodeId: string
}

export function NodeDataInspector({ nodeId }: NodeDataInspectorProps) {
  const node = usePipelineStore((s) => s.nodes.find((n) => n.id === nodeId))

  if (!node) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-zinc-500">
        Node not found
      </div>
    )
  }

  const def = node.type ? NODE_REGISTRY[node.type] : null
  const exec = node.data.execution

  if (!exec) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2 text-zinc-500">
        <div className="h-8 w-8 rounded-full border-2 border-dashed border-zinc-600 flex items-center justify-center">
          <Clock size={14} />
        </div>
        <p className="text-sm">No execution data</p>
        <p className="text-xs text-zinc-600">Run a query to see data for this node</p>
      </div>
    )
  }

  return (
    <ScrollArea className="h-full">
      <div className="space-y-3 p-3">
        {/* Node header */}
        <NodeHeader label={def?.label ?? node.type ?? 'Unknown'} execution={exec} color={def?.color} />

        {/* Error display */}
        {exec.error && (
          <div className="rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2">
            <div className="flex items-center gap-1.5 text-xs font-medium text-red-400">
              <AlertCircle size={12} />
              Error
            </div>
            <p className="mt-1 text-xs text-red-300 font-mono break-all">{exec.error}</p>
          </div>
        )}

        {/* Skip reason */}
        {exec.skipReason && (
          <div className="rounded-md border border-zinc-600/30 bg-zinc-700/20 px-3 py-2">
            <div className="flex items-center gap-1.5 text-xs font-medium text-zinc-400">
              <SkipForward size={12} />
              Skipped
            </div>
            <p className="mt-1 text-xs text-zinc-400">{exec.skipReason}</p>
          </div>
        )}

        {/* Input data */}
        {exec.inputData && Object.keys(exec.inputData).length > 0 && (
          <CollapsibleSection title="Input Data" defaultOpen>
            <JsonTree data={exec.inputData} />
          </CollapsibleSection>
        )}

        {/* Output data */}
        {exec.outputData && Object.keys(exec.outputData).length > 0 && (
          <CollapsibleSection title="Output Data" defaultOpen>
            <JsonTree data={exec.outputData} />
          </CollapsibleSection>
        )}

        {/* Metrics */}
        {(exec.latencyMs !== undefined || exec.cost !== undefined) && (
          <CollapsibleSection title="Metrics" defaultOpen={false}>
            <div className="space-y-1.5 text-xs">
              {exec.latencyMs !== undefined && (
                <div className="flex items-center justify-between text-zinc-300">
                  <span className="text-zinc-500">Latency</span>
                  <span className="font-mono">
                    {exec.latencyMs < 1000
                      ? `${exec.latencyMs.toFixed(0)}ms`
                      : `${(exec.latencyMs / 1000).toFixed(2)}s`}
                  </span>
                </div>
              )}
              {exec.cost !== undefined && (
                <div className="flex items-center justify-between text-zinc-300">
                  <span className="text-zinc-500">Cost</span>
                  <span className="font-mono">${exec.cost.toFixed(6)}</span>
                </div>
              )}
            </div>
          </CollapsibleSection>
        )}
      </div>
    </ScrollArea>
  )
}

function NodeHeader({ label, execution, color }: { label: string; execution: NodeExecutionData; color?: string }) {
  const statusColor =
    execution.status === 'success'
      ? 'border-green-500/40 bg-green-500/10'
      : execution.status === 'error'
        ? 'border-red-500/40 bg-red-500/10'
        : execution.status === 'running'
          ? 'border-yellow-500/40 bg-yellow-500/10'
          : 'border-zinc-600/40 bg-zinc-700/10'

  const statusText =
    execution.status === 'success'
      ? 'text-green-400'
      : execution.status === 'error'
        ? 'text-red-400'
        : execution.status === 'running'
          ? 'text-yellow-400'
          : 'text-zinc-400'

  return (
    <div className={`rounded-md border px-3 py-2 ${statusColor}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {color && <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: color }} />}
          <span className="text-sm font-semibold text-zinc-200">{label}</span>
        </div>
        <Badge variant="outline" className={`text-[10px] ${statusText}`}>
          {execution.status === 'success' && <CheckCircle size={10} className="mr-1" />}
          {execution.status === 'error' && <AlertCircle size={10} className="mr-1" />}
          {execution.status === 'skipped' && <SkipForward size={10} className="mr-1" />}
          {execution.status}
        </Badge>
      </div>
    </div>
  )
}

function CollapsibleSection({
  title,
  defaultOpen = true,
  children,
}: {
  title: string
  defaultOpen?: boolean
  children: React.ReactNode
}) {
  const [open, setOpen] = useState(defaultOpen)

  return (
    <div className="rounded-md border border-zinc-700/50">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex w-full items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-zinc-400 hover:text-zinc-300 transition-colors"
      >
        {open ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
        {title}
      </button>
      {open && (
        <div className="border-t border-zinc-700/50 px-3 py-2">
          {children}
        </div>
      )}
    </div>
  )
}

function JsonTree({ data }: { data: unknown }) {
  return (
    <div className="font-mono text-[11px] leading-relaxed">
      <JsonValue value={data} depth={0} />
    </div>
  )
}

function JsonValue({ value, depth }: { value: unknown; depth: number }) {
  if (value === null) return <span className="text-zinc-500">null</span>
  if (value === undefined) return <span className="text-zinc-500">undefined</span>

  if (typeof value === 'boolean') {
    return <span className="text-amber-400">{value ? 'true' : 'false'}</span>
  }

  if (typeof value === 'number') {
    return <span className="text-cyan-400">{value}</span>
  }

  if (typeof value === 'string') {
    // Truncate long strings
    const display = value.length > 200 ? value.slice(0, 200) + '...' : value
    return <span className="text-green-400 break-all">&quot;{display}&quot;</span>
  }

  if (Array.isArray(value)) {
    return <JsonArray items={value} depth={depth} />
  }

  if (typeof value === 'object') {
    return <JsonObject obj={value as Record<string, unknown>} depth={depth} />
  }

  return <span className="text-zinc-400">{String(value)}</span>
}

function JsonArray({ items, depth }: { items: unknown[]; depth: number }) {
  const [expanded, setExpanded] = useState(depth < 2)

  if (items.length === 0) return <span className="text-zinc-500">[]</span>

  if (!expanded) {
    return (
      <button type="button" onClick={() => setExpanded(true)} className="text-zinc-400 hover:text-zinc-200">
        [{items.length} items]
      </button>
    )
  }

  return (
    <div>
      <button type="button" onClick={() => setExpanded(false)} className="text-zinc-500 hover:text-zinc-300">
        [
      </button>
      <div className="ml-3 border-l border-zinc-700/40 pl-2">
        {items.map((item, i) => (
          <div key={i}>
            <JsonValue value={item} depth={depth + 1} />
            {i < items.length - 1 && <span className="text-zinc-600">,</span>}
          </div>
        ))}
      </div>
      <span className="text-zinc-500">]</span>
    </div>
  )
}

function JsonObject({ obj, depth }: { obj: Record<string, unknown>; depth: number }) {
  const [expanded, setExpanded] = useState(depth < 2)
  const keys = Object.keys(obj)

  if (keys.length === 0) return <span className="text-zinc-500">{'{}'}</span>

  if (!expanded) {
    return (
      <button type="button" onClick={() => setExpanded(true)} className="text-zinc-400 hover:text-zinc-200">
        {'{'}{keys.length} keys{'}'}
      </button>
    )
  }

  return (
    <div>
      <button type="button" onClick={() => setExpanded(false)} className="text-zinc-500 hover:text-zinc-300">
        {'{'}
      </button>
      <div className="ml-3 border-l border-zinc-700/40 pl-2">
        {keys.map((key, i) => (
          <div key={key}>
            <span className="text-purple-400">&quot;{key}&quot;</span>
            <span className="text-zinc-600">: </span>
            <JsonValue value={obj[key]} depth={depth + 1} />
            {i < keys.length - 1 && <span className="text-zinc-600">,</span>}
          </div>
        ))}
      </div>
      <span className="text-zinc-500">{'}'}</span>
    </div>
  )
}
