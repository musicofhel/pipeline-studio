'use client'

import { useState, useCallback } from 'react'
import { ChevronDown, ChevronRight } from 'lucide-react'
import {
  ShieldAlert, Eye, ShieldCheck, ShieldBan, GitBranch, Expand,
  Database, Copy, ArrowUpDown, Minimize2, Route, Sparkles,
  CheckCircle, FileCheck, Activity, BarChart3, Send, MessageSquare,
} from 'lucide-react'
import { NODE_REGISTRY, NODE_CATEGORIES } from '@/lib/nodes/registry'
import { NodeCategory, NodeDefinition } from '@/types/nodes'
import { ScrollArea } from '@/components/ui/scroll-area'

const ICON_MAP: Record<string, React.ComponentType<{ size?: number; className?: string; style?: React.CSSProperties }>> = {
  ShieldAlert, Eye, ShieldCheck, ShieldBan, GitBranch, Expand,
  Database, Copy, ArrowUpDown, Minimize2, Route, Sparkles,
  CheckCircle, FileCheck, Activity, BarChart3, Send, MessageSquare,
}

function groupByCategory(): Record<NodeCategory, NodeDefinition[]> {
  const groups: Partial<Record<NodeCategory, NodeDefinition[]>> = {}
  for (const def of Object.values(NODE_REGISTRY)) {
    if (!groups[def.category]) groups[def.category] = []
    groups[def.category]!.push(def)
  }
  return groups as Record<NodeCategory, NodeDefinition[]>
}

const CATEGORY_ORDER: NodeCategory[] = [
  'input', 'safety', 'routing', 'expansion', 'retrieval',
  'compression', 'generation', 'quality', 'observability', 'output',
]

export function NodePalette() {
  const grouped = groupByCategory()
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({})

  const toggleCategory = useCallback((cat: string) => {
    setCollapsed((prev) => ({ ...prev, [cat]: !prev[cat] }))
  }, [])

  return (
    <div className="flex h-full w-56 flex-col border-r border-zinc-700 bg-zinc-900">
      <div className="border-b border-zinc-700 px-3 py-2">
        <h2 className="text-sm font-semibold text-zinc-200">Node Palette</h2>
      </div>
      <ScrollArea className="flex-1">
        <div className="p-2">
          {CATEGORY_ORDER.map((cat) => {
            const catDef = NODE_CATEGORIES[cat]
            const nodes = grouped[cat]
            if (!nodes?.length) return null
            const isCollapsed = collapsed[cat]

            const CatIcon = ICON_MAP[catDef.icon]

            return (
              <div key={cat} className="mb-1">
                <button
                  onClick={() => toggleCategory(cat)}
                  className="flex w-full items-center gap-1.5 rounded px-2 py-1.5 text-xs font-medium text-zinc-300 hover:bg-zinc-800"
                >
                  {isCollapsed ? <ChevronRight size={12} /> : <ChevronDown size={12} />}
                  {CatIcon && <CatIcon size={12} style={{ color: catDef.color }} />}
                  <span>{catDef.label}</span>
                  <span className="ml-auto text-zinc-500">{nodes.length}</span>
                </button>
                {!isCollapsed && (
                  <div className="ml-2 space-y-0.5">
                    {nodes.map((def) => (
                      <PaletteNode key={def.type} def={def} />
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </ScrollArea>
    </div>
  )
}

function PaletteNode({ def }: { def: NodeDefinition }) {
  const IconComp = ICON_MAP[def.icon]

  const handleDragStart = useCallback(
    (event: React.DragEvent) => {
      event.dataTransfer.setData('application/pipeline-node', def.type)
      event.dataTransfer.effectAllowed = 'move'
    },
    [def.type]
  )

  return (
    <div
      draggable
      onDragStart={handleDragStart}
      className="flex cursor-grab items-center gap-2 rounded px-2 py-1.5 text-xs text-zinc-300 hover:bg-zinc-800 active:cursor-grabbing"
      title={def.description}
    >
      {IconComp && <IconComp size={12} style={{ color: def.color }} />}
      <span className="truncate">{def.label}</span>
      {def.requiresApiKey && (
        <span className="ml-auto h-1.5 w-1.5 rounded-full bg-amber-500" title={`Requires ${def.requiresApiKey}`} />
      )}
    </div>
  )
}
