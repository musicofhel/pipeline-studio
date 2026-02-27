'use client'

import { useEffect, useRef } from 'react'
import { Settings, CopyPlus, EyeOff, Eye, Trash2 } from 'lucide-react'
import { NODE_REGISTRY } from '@/lib/nodes/registry'
import { usePipelineStore } from '@/lib/store/pipeline-store'
import { useUIStore } from '@/lib/store/ui-store'

export interface ContextMenuState {
  nodeId: string
  x: number
  y: number
}

interface NodeContextMenuProps {
  menu: ContextMenuState
  onClose: () => void
}

export function NodeContextMenu({ menu, onClose }: NodeContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null)

  const node = usePipelineStore((s) => s.nodes.find((n) => n.id === menu.nodeId))
  const removeNode = usePipelineStore((s) => s.removeNode)
  const duplicateNode = usePipelineStore((s) => s.duplicateNode)
  const setSelectedNodeId = usePipelineStore((s) => s.setSelectedNodeId)
  const setNodeStatus = usePipelineStore((s) => s.setNodeStatus)
  const setConfigPanelOpen = useUIStore((s) => s.setConfigPanelOpen)

  const nodeType = node?.type
  const def = nodeType ? NODE_REGISTRY[nodeType] : null
  const isDisabled = node?.data?.execution?.status === 'disabled'

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  // Close on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose()
      }
    }
    // Use setTimeout to avoid catching the same right-click event
    const timeout = setTimeout(() => {
      window.addEventListener('mousedown', handleClick)
    }, 0)
    return () => {
      clearTimeout(timeout)
      window.removeEventListener('mousedown', handleClick)
    }
  }, [onClose])

  // Adjust position so the menu doesn't overflow the viewport
  useEffect(() => {
    if (!menuRef.current) return
    const rect = menuRef.current.getBoundingClientRect()
    const viewportWidth = window.innerWidth
    const viewportHeight = window.innerHeight

    if (rect.right > viewportWidth) {
      menuRef.current.style.left = `${menu.x - rect.width}px`
    }
    if (rect.bottom > viewportHeight) {
      menuRef.current.style.top = `${menu.y - rect.height}px`
    }
  }, [menu.x, menu.y])

  if (!node || !def) return null

  const label = def.label

  const handleConfigure = () => {
    setSelectedNodeId(menu.nodeId)
    setConfigPanelOpen(true)
    onClose()
  }

  const handleDuplicate = () => {
    duplicateNode(menu.nodeId)
    onClose()
  }

  const handleToggleDisable = () => {
    if (isDisabled) {
      setNodeStatus(menu.nodeId, 'idle')
    } else {
      setNodeStatus(menu.nodeId, 'disabled')
    }
    onClose()
  }

  const handleDelete = () => {
    removeNode(menu.nodeId)
    onClose()
  }

  const itemBase =
    'relative flex cursor-default items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none select-none transition-colors hover:bg-zinc-700 hover:text-zinc-100 focus:bg-zinc-700 focus:text-zinc-100'

  return (
    <div
      ref={menuRef}
      className="fixed z-50 min-w-[180px] rounded-md border border-zinc-700 bg-zinc-900 p-1 shadow-lg"
      style={{ left: menu.x, top: menu.y }}
    >
      {/* Header with node label */}
      <div className="px-2 py-1.5 text-xs font-medium text-zinc-400 truncate">
        {label}
      </div>

      <div className="-mx-1 my-1 h-px bg-zinc-700" />

      <button className={`${itemBase} w-full text-zinc-200`} onClick={handleConfigure}>
        <Settings size={14} className="text-zinc-400" />
        Configure
      </button>

      <button className={`${itemBase} w-full text-zinc-200`} onClick={handleDuplicate}>
        <CopyPlus size={14} className="text-zinc-400" />
        Duplicate
        <span className="ml-auto text-xs text-zinc-500">D</span>
      </button>

      <button className={`${itemBase} w-full text-zinc-200`} onClick={handleToggleDisable}>
        {isDisabled ? (
          <>
            <Eye size={14} className="text-zinc-400" />
            Enable
          </>
        ) : (
          <>
            <EyeOff size={14} className="text-zinc-400" />
            Disable
          </>
        )}
      </button>

      <div className="-mx-1 my-1 h-px bg-zinc-700" />

      <button className={`${itemBase} w-full text-red-400 hover:text-red-300 hover:bg-red-500/10`} onClick={handleDelete}>
        <Trash2 size={14} />
        Delete
        <span className="ml-auto text-xs text-red-500/60">Del</span>
      </button>
    </div>
  )
}
