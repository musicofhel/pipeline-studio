'use client'

import { memo } from 'react'
import { ConfigField } from '@/types/nodes'

interface NodeConfigSummaryProps {
  config: Record<string, unknown>
  schema: ConfigField[]
}

function formatConfigValue(val: unknown, field: ConfigField): string {
  if (val === undefined || val === null) return ''
  switch (field.type) {
    case 'boolean':
      return val ? 'on' : 'off'
    case 'slider':
      return Number(val).toFixed(2)
    case 'number':
      return String(val)
    case 'text':
    case 'select': {
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
): Array<{ label: string; value: string }> {
  const rows: Array<{ label: string; value: string }> = []

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
