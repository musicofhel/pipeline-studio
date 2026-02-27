'use client'

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Keyboard } from 'lucide-react'

interface ShortcutEntry {
  keys: string[]
  description: string
}

const SHORTCUTS: ShortcutEntry[] = [
  { keys: ['Space'], description: 'Run pipeline' },
  { keys: ['Ctrl', 'Z'], description: 'Undo' },
  { keys: ['Ctrl', 'Shift', 'Z'], description: 'Redo' },
  { keys: ['Delete'], description: 'Delete selected node' },
  { keys: ['D'], description: 'Duplicate selected node' },
  { keys: ['L'], description: 'Auto-layout' },
  { keys: ['Escape'], description: 'Deselect / close panel' },
  { keys: ['?'], description: 'Show this help' },
]

interface KeyboardShortcutsHelpProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function KeyboardShortcutsHelp({ open, onOpenChange }: KeyboardShortcutsHelpProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="border-zinc-700 bg-zinc-900 text-zinc-100 sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-zinc-100">
            <Keyboard size={18} className="text-zinc-400" />
            Keyboard Shortcuts
          </DialogTitle>
          <DialogDescription className="text-zinc-400">
            Available shortcuts when the canvas is focused.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-1">
          {SHORTCUTS.map((shortcut) => (
            <div
              key={shortcut.description}
              className="flex items-center justify-between rounded-md px-3 py-2 hover:bg-zinc-800/60"
            >
              <span className="text-sm text-zinc-300">{shortcut.description}</span>
              <div className="flex items-center gap-1">
                {shortcut.keys.map((key, i) => (
                  <span key={i} className="flex items-center gap-1">
                    {i > 0 && <span className="text-xs text-zinc-500">+</span>}
                    <kbd className="inline-flex h-6 min-w-[24px] items-center justify-center rounded border border-zinc-600 bg-zinc-800 px-1.5 font-mono text-xs text-zinc-300 shadow-[0_1px_0_0_rgba(63,63,70,0.5)]">
                      {key}
                    </kbd>
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-2 rounded-md bg-zinc-800/50 px-3 py-2">
          <p className="text-xs text-zinc-500">
            Shortcuts are disabled when typing in input fields.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  )
}
