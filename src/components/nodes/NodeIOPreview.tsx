'use client'

import { useState, memo } from 'react'
import { ChevronDown, ChevronRight } from 'lucide-react'
import type { NodeExecutionData } from '@/types/nodes'

interface NodeIOPreviewProps {
  execution: NodeExecutionData | undefined
}

function NodeIOPreviewComponent({ execution }: NodeIOPreviewProps) {
  const [expanded, setExpanded] = useState(false)

  if (!execution) return null
  const isComplete = execution.status === 'success' || execution.status === 'error'
  if (!isComplete) return null

  const hasInput = execution.inputData && Object.keys(execution.inputData).length > 0
  const hasOutput = execution.outputData && Object.keys(execution.outputData).length > 0
  if (!hasInput && !hasOutput) return null

  return (
    <div className="border-t border-zinc-800">
      <button
        onClick={(e) => { e.stopPropagation(); setExpanded(!expanded) }}
        className="flex w-full items-center gap-1 px-3 py-1 text-[9px] text-zinc-500 hover:text-zinc-400 transition-colors"
      >
        {expanded ? <ChevronDown size={8} /> : <ChevronRight size={8} />}
        <span>I/O Data</span>
        {hasInput && <span className="text-blue-400 ml-1">in</span>}
        {hasOutput && <span className="text-green-400 ml-0.5">out</span>}
      </button>
      {expanded && (
        <div className="px-3 pb-2 space-y-1.5">
          {hasInput && (
            <div>
              <span className="text-[8px] uppercase tracking-wider text-zinc-600 font-medium">Input</span>
              <pre className="mt-0.5 max-h-20 overflow-auto rounded bg-zinc-950 p-1.5 text-[9px] text-zinc-400 font-mono leading-tight scrollbar-thin">
                {truncateJSON(execution.inputData!, 200)}
              </pre>
            </div>
          )}
          {hasOutput && (
            <div>
              <span className="text-[8px] uppercase tracking-wider text-zinc-600 font-medium">Output</span>
              <pre className="mt-0.5 max-h-20 overflow-auto rounded bg-zinc-950 p-1.5 text-[9px] text-zinc-400 font-mono leading-tight scrollbar-thin">
                {truncateJSON(execution.outputData!, 200)}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function truncateJSON(data: Record<string, unknown>, maxLen: number): string {
  const str = JSON.stringify(data, null, 1)
  return str.length > maxLen ? str.slice(0, maxLen) + '\n...' : str
}

export const NodeIOPreview = memo(NodeIOPreviewComponent)
