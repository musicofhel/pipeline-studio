'use client'

import { useCallback } from 'react'
import { X, RotateCcw, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Slider } from '@/components/ui/slider'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { NODE_REGISTRY, NODE_CATEGORIES } from '@/lib/nodes/registry'
import { ConfigField } from '@/types/nodes'
import { usePipelineStore } from '@/lib/store/pipeline-store'
import { useUIStore } from '@/lib/store/ui-store'

export function ConfigPanel() {
  const selectedNodeId = usePipelineStore((s) => s.selectedNodeId)
  const configPanelOpen = useUIStore((s) => s.configPanelOpen)
  const setConfigPanelOpen = useUIStore((s) => s.setConfigPanelOpen)

  const node = usePipelineStore((s) => {
    if (!s.selectedNodeId) return null
    return s.nodes.find((n) => n.id === s.selectedNodeId) ?? null
  })

  const updateNodeConfig = usePipelineStore((s) => s.updateNodeConfig)
  const updateNodeNotes = usePipelineStore((s) => s.updateNodeNotes)
  const removeNode = usePipelineStore((s) => s.removeNode)
  const duplicateNode = usePipelineStore((s) => s.duplicateNode)

  if (!configPanelOpen || !selectedNodeId || !node || !node.type) return null

  const def = NODE_REGISTRY[node.type]
  if (!def) return null

  const catDef = NODE_CATEGORIES[def.category]
  const config = node.data.config

  const handleReset = () => {
    updateNodeConfig(selectedNodeId, { ...def.defaultConfig })
  }

  const handleDelete = () => {
    removeNode(selectedNodeId)
    setConfigPanelOpen(false)
  }

  return (
    <div className="flex h-full w-72 flex-col border-l border-zinc-700 bg-zinc-900">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-zinc-700 px-3 py-2">
        <div className="flex items-center gap-2">
          <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: def.color }} />
          <span className="text-sm font-semibold text-zinc-200">{def.label}</span>
        </div>
        <Button size="sm" variant="ghost" onClick={() => setConfigPanelOpen(false)} className="h-6 w-6 p-0 text-zinc-400">
          <X size={14} />
        </Button>
      </div>

      {/* Metadata */}
      <div className="border-b border-zinc-700 px-3 py-2">
        <p className="text-xs text-zinc-400">{def.description}</p>
        <div className="mt-1.5 flex flex-wrap gap-1">
          <Badge variant="outline" className="text-[10px]" style={{ borderColor: catDef.color, color: catDef.color }}>
            {catDef.label}
          </Badge>
          <Badge variant="outline" className="text-[10px] text-zinc-400">
            {def.service}
          </Badge>
          {def.estimatedLatencyMs && (
            <Badge variant="outline" className="text-[10px] text-zinc-400">
              ~{def.estimatedLatencyMs}ms
            </Badge>
          )}
          {def.requiresApiKey && (
            <Badge variant="outline" className="text-[10px] border-amber-500/50 text-amber-400">
              {def.requiresApiKey}
            </Badge>
          )}
        </div>
      </div>

      {/* Config fields */}
      <ScrollArea className="flex-1">
        <div className="space-y-3 p-3">
          {def.configSchema.map((field) => (
            <ConfigFieldRenderer
              key={field.key}
              field={field}
              value={config[field.key] ?? field.default}
              onChange={(val) => updateNodeConfig(selectedNodeId, { [field.key]: val })}
            />
          ))}

          {/* Node notes / annotations */}
          <Separator className="bg-zinc-700" />
          <div>
            <Label className="text-xs text-zinc-400">Notes</Label>
            <textarea
              value={node.data.notes ?? ''}
              onChange={(e) => updateNodeNotes(selectedNodeId, e.target.value)}
              placeholder="Add notes or annotations..."
              className="mt-1 h-20 w-full resize-y rounded-md border border-zinc-700 bg-zinc-800 p-2 text-xs text-zinc-100 placeholder:text-zinc-500 focus:border-zinc-600 focus:outline-none"
            />
            <p className="mt-0.5 text-[10px] text-zinc-500">
              Notes are saved with the pipeline and visible only here.
            </p>
          </div>
        </div>
      </ScrollArea>

      {/* Actions */}
      <div className="border-t border-zinc-700 p-2">
        <div className="flex gap-1.5">
          <Button size="sm" variant="ghost" onClick={handleReset} className="flex-1 h-7 gap-1 text-xs text-zinc-400">
            <RotateCcw size={12} /> Reset
          </Button>
          <Button size="sm" variant="ghost" onClick={handleDelete} className="flex-1 h-7 gap-1 text-xs text-red-400 hover:text-red-300">
            <Trash2 size={12} /> Delete
          </Button>
        </div>
      </div>
    </div>
  )
}

function ConfigFieldRenderer({
  field,
  value,
  onChange,
}: {
  field: ConfigField
  value: unknown
  onChange: (val: unknown) => void
}) {
  switch (field.type) {
    case 'text':
      return (
        <div>
          <Label className="text-xs text-zinc-400">{field.label}</Label>
          <Input
            value={String(value ?? '')}
            onChange={(e) => onChange(e.target.value)}
            className="mt-1 h-8 border-zinc-700 bg-zinc-800 text-xs text-zinc-100"
          />
          {field.description && <p className="mt-0.5 text-[10px] text-zinc-500">{field.description}</p>}
        </div>
      )

    case 'number':
      return (
        <div>
          <Label className="text-xs text-zinc-400">{field.label}</Label>
          <Input
            type="number"
            value={Number(value ?? field.default)}
            onChange={(e) => onChange(Number(e.target.value))}
            min={field.min}
            max={field.max}
            step={field.step}
            className="mt-1 h-8 border-zinc-700 bg-zinc-800 text-xs text-zinc-100"
          />
          {field.description && <p className="mt-0.5 text-[10px] text-zinc-500">{field.description}</p>}
        </div>
      )

    case 'boolean':
      return (
        <div className="flex items-center justify-between">
          <Label className="text-xs text-zinc-400">{field.label}</Label>
          <Switch
            checked={Boolean(value)}
            onCheckedChange={(checked) => onChange(checked)}
          />
        </div>
      )

    case 'slider':
      return (
        <div>
          <div className="flex items-center justify-between">
            <Label className="text-xs text-zinc-400">{field.label}</Label>
            <span className="text-xs font-mono text-zinc-300">{Number(value ?? field.default).toFixed(2)}</span>
          </div>
          <Slider
            value={[Number(value ?? field.default)]}
            onValueChange={([v]) => onChange(v)}
            min={field.min ?? 0}
            max={field.max ?? 1}
            step={field.step ?? 0.01}
            className="mt-2"
          />
          {field.description && <p className="mt-0.5 text-[10px] text-zinc-500">{field.description}</p>}
        </div>
      )

    case 'select':
      return (
        <div>
          <Label className="text-xs text-zinc-400">{field.label}</Label>
          <Select value={String(value ?? field.default)} onValueChange={(v) => onChange(v)}>
            <SelectTrigger className="mt-1 h-8 border-zinc-700 bg-zinc-800 text-xs text-zinc-100">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="border-zinc-700 bg-zinc-800">
              {field.options?.map((opt) => (
                <SelectItem key={String(opt.value)} value={String(opt.value)} className="text-xs text-zinc-200">
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {field.description && <p className="mt-0.5 text-[10px] text-zinc-500">{field.description}</p>}
        </div>
      )

    case 'code':
    case 'json':
      return (
        <div>
          <Label className="text-xs text-zinc-400">{field.label}</Label>
          <textarea
            value={typeof value === 'string' ? value : JSON.stringify(value, null, 2)}
            onChange={(e) => {
              if (field.type === 'json') {
                try { onChange(JSON.parse(e.target.value)) } catch { /* invalid json, keep as string */ }
              } else {
                onChange(e.target.value)
              }
            }}
            className="mt-1 h-24 w-full rounded-md border border-zinc-700 bg-zinc-800 p-2 font-mono text-xs text-zinc-100 resize-y"
          />
          {field.description && <p className="mt-0.5 text-[10px] text-zinc-500">{field.description}</p>}
        </div>
      )

    default:
      return null
  }
}
