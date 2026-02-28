'use client'

import { useState, useCallback, useMemo } from 'react'
import { ChevronDown, ChevronRight, Search, X } from 'lucide-react'
import {
  ShieldAlert, Eye, ShieldCheck, ShieldBan, GitBranch, Expand,
  Database, Copy, ArrowUpDown, Minimize2, Route, Sparkles,
  CheckCircle, FileCheck, Activity, BarChart3, Send, MessageSquare,
} from 'lucide-react'
import { NODE_REGISTRY, NODE_CATEGORIES } from '@/lib/nodes/registry'
import { NodeCategory, NodeDefinition } from '@/types/nodes'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Input } from '@/components/ui/input'

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
  const [searchQuery, setSearchQuery] = useState('')

  const toggleCategory = useCallback((cat: string) => {
    setCollapsed((prev) => ({ ...prev, [cat]: !prev[cat] }))
  }, [])

  const clearSearch = useCallback(() => {
    setSearchQuery('')
  }, [])

  // Filter nodes by search query, matching against name, description, and category label
  const filteredGrouped = useMemo(() => {
    if (!searchQuery.trim()) return null // null means "no filter active"
    const query = searchQuery.toLowerCase().trim()
    const result: Partial<Record<NodeCategory, NodeDefinition[]>> = {}
    for (const cat of CATEGORY_ORDER) {
      const catDef = NODE_CATEGORIES[cat]
      const nodes = grouped[cat]
      if (!nodes?.length) continue
      const categoryMatches = catDef.label.toLowerCase().includes(query)
      const matchingNodes = nodes.filter(
        (def) =>
          categoryMatches ||
          def.label.toLowerCase().includes(query) ||
          def.description.toLowerCase().includes(query) ||
          def.type.toLowerCase().includes(query)
      )
      if (matchingNodes.length > 0) {
        result[cat] = matchingNodes
      }
    }
    return result
  }, [searchQuery, grouped])

  const isSearchActive = searchQuery.trim().length > 0

  return (
    <div className="flex h-full w-56 flex-col border-r border-zinc-700 bg-zinc-900">
      <div className="border-b border-zinc-700 px-3 py-2">
        <h2 className="text-sm font-semibold text-zinc-200">Node Palette</h2>
      </div>

      {/* Search input */}
      <div className="border-b border-zinc-700 px-2 py-2">
        <div className="relative">
          <Search size={14} className="absolute left-2 top-1/2 -translate-y-1/2 text-zinc-500" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search nodes..."
            className="h-7 border-zinc-700 bg-zinc-800 pl-7 pr-7 text-xs text-zinc-100 placeholder:text-zinc-500"
          />
          {isSearchActive && (
            <button
              onClick={clearSearch}
              className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded p-0.5 text-zinc-500 hover:text-zinc-300"
            >
              <X size={12} />
            </button>
          )}
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-2">
          {CATEGORY_ORDER.map((cat) => {
            const catDef = NODE_CATEGORIES[cat]
            // If search active, use filtered set; otherwise use full set
            const nodes = isSearchActive
              ? (filteredGrouped?.[cat] ?? null)
              : (grouped[cat] ?? null)
            if (!nodes?.length) return null

            // When searching, force categories open; otherwise respect collapsed state
            const isCollapsed = isSearchActive ? false : collapsed[cat]
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
                      <PaletteNode key={def.type} def={def} highlight={isSearchActive ? searchQuery : undefined} />
                    ))}
                  </div>
                )}
              </div>
            )
          })}
          {isSearchActive && filteredGrouped && Object.keys(filteredGrouped).length === 0 && (
            <div className="py-4 text-center text-xs text-zinc-500">
              No nodes match &quot;{searchQuery}&quot;
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  )
}

function formatEstimate(def: NodeDefinition): string {
  const parts: string[] = []
  if (def.estimatedLatencyMs) parts.push(`~${def.estimatedLatencyMs}ms`)
  if (def.estimatedCostPerCall) parts.push(`~$${def.estimatedCostPerCall}`)
  return parts.length > 0 ? parts.join(' | ') : ''
}

function PaletteNode({ def, highlight }: { def: NodeDefinition; highlight?: string }) {
  const IconComp = ICON_MAP[def.icon]
  const estimate = formatEstimate(def)

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
      title={`${def.description}${estimate ? `\n${estimate}` : ''}`}
    >
      {IconComp && <IconComp size={12} style={{ color: def.color }} />}
      <div className="flex min-w-0 flex-col">
        <span className="truncate">
          {highlight ? <HighlightText text={def.label} query={highlight} /> : def.label}
        </span>
        {estimate && (
          <span className="truncate text-[9px] text-zinc-500">{estimate}</span>
        )}
      </div>
      {def.requiresApiKey && (
        <span className="ml-auto h-1.5 w-1.5 shrink-0 rounded-full bg-amber-500" title={`Requires ${def.requiresApiKey}`} />
      )}
    </div>
  )
}

/** Highlights matching portions of text with a yellow background. */
function HighlightText({ text, query }: { text: string; query: string }) {
  if (!query.trim()) return <>{text}</>
  const lowerText = text.toLowerCase()
  const lowerQuery = query.toLowerCase().trim()
  const index = lowerText.indexOf(lowerQuery)
  if (index === -1) return <>{text}</>
  return (
    <>
      {text.slice(0, index)}
      <span className="rounded bg-yellow-500/30 text-yellow-200">
        {text.slice(index, index + lowerQuery.length)}
      </span>
      {text.slice(index + lowerQuery.length)}
    </>
  )
}
