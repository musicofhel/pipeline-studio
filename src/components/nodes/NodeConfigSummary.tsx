'use client'

import { memo } from 'react'
import { ConfigField } from '@/types/nodes'

interface NodeConfigSummaryProps {
  config: Record<string, unknown>
  schema: ConfigField[]
}

function formatConfigValue(val: unknown, field: ConfigField): React.ReactNode {
  if (val === undefined || val === null) return ''
  switch (field.type) {
    case 'boolean':
      return (
        <span
          className="inline-block h-2 w-2 rounded-full"
          style={{ backgroundColor: val ? '#22c55e' : '#ef4444' }}
          title={val ? 'Enabled' : 'Disabled'}
        />
      )
    case 'slider': {
      const num = Number(val)
      const max = field.max ?? 1
      const min = field.min ?? 0
      const pct = Math.min(100, Math.max(0, ((num - min) / (max - min)) * 100))
      return (
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block h-[6px] w-8 overflow-hidden rounded-full bg-zinc-800">
            <span className="block h-full rounded-full bg-zinc-500" style={{ width: `${pct}%` }} />
          </span>
          <span>{num.toFixed(2)}</span>
        </span>
      )
    }
    case 'number':
      return String(val)
    case 'select': {
      // Show selected option label if available
      const option = field.options?.find((o) => o.value === val)
      const display = option?.label ?? String(val)
      return display.length > 24 ? display.slice(0, 24) + '\u2026' : display
    }
    case 'text': {
      const str = String(val)
      return str.length > 24 ? str.slice(0, 24) + '\u2026' : str
    }
    default:
      return String(val)
  }
}

function getConfigSummary(
  config: Record<string, unknown>,
  schema: ConfigField[],
): Array<{ label: string; value: React.ReactNode }> {
  const rows: Array<{ label: string; value: React.ReactNode }> = []

  for (const field of schema) {
    if (rows.length >= 4) break

    // Skip json/code fields
    if (field.type === 'json' || field.type === 'code') continue

    const val = config[field.key]

    // Skip undefined and empty strings
    if (val === undefined || val === '') continue

    // Skip booleans that equal their default
    if (field.type === 'boolean' && val === field.default) continue

    rows.push({
      label: field.label,
      value: formatConfigValue(val, field),
    })
  }

  return rows
}

function NodeConfigSummaryComponent({ config, schema }: NodeConfigSummaryProps) {
  const rows = getConfigSummary(config, schema)

  if (rows.length === 0) return null

  return (
    <div className="border-t border-zinc-800 px-3 py-1.5">
      {rows.map((row) => (
        <div key={row.label} className="flex items-center justify-between gap-2 py-px">
          <span className="truncate text-[10px] text-zinc-500">{row.label}</span>
          <span className="shrink-0 font-mono text-[10px] text-zinc-300">{row.value}</span>
        </div>
      ))}
    </div>
  )
}

export const NodeConfigSummary = memo(NodeConfigSummaryComponent)
