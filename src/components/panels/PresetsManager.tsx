'use client'

import { useState, useCallback, type ReactNode } from 'react'
import { Save, Trash2, Upload, Download, Pencil, Check, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { usePresetsStore, type PipelinePreset } from '@/lib/store/presets-store'

function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function PresetRow({
  preset,
  onLoad,
  onDelete,
  onRename,
  onExport,
}: {
  preset: PipelinePreset
  onLoad: (id: string) => void
  onDelete: (id: string) => void
  onRename: (id: string, name: string) => void
  onExport: (id: string) => void
}) {
  const [editing, setEditing] = useState(false)
  const [editName, setEditName] = useState(preset.name)
  const [confirmDelete, setConfirmDelete] = useState(false)

  const handleRename = () => {
    if (editName.trim()) {
      onRename(preset.id, editName.trim())
    }
    setEditing(false)
  }

  const handleDelete = () => {
    if (confirmDelete) {
      onDelete(preset.id)
      setConfirmDelete(false)
    } else {
      setConfirmDelete(true)
      // Auto-dismiss confirmation after 3s
      setTimeout(() => setConfirmDelete(false), 3000)
    }
  }

  return (
    <div className="group flex flex-col gap-1.5 rounded-md border border-zinc-700/50 bg-zinc-800/50 p-3 transition-colors hover:border-zinc-600">
      <div className="flex items-start justify-between gap-2">
        {editing ? (
          <div className="flex flex-1 items-center gap-1">
            <Input
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              className="h-7 border-zinc-600 bg-zinc-700 text-sm text-zinc-200"
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleRename()
                if (e.key === 'Escape') setEditing(false)
              }}
              autoFocus
            />
            <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-green-400" onClick={handleRename}>
              <Check size={12} />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="h-7 w-7 p-0 text-zinc-400"
              onClick={() => setEditing(false)}
            >
              <X size={12} />
            </Button>
          </div>
        ) : (
          <div className="min-w-0 flex-1">
            <h4 className="truncate text-sm font-medium text-zinc-200">{preset.name}</h4>
            {preset.description && (
              <p className="mt-0.5 truncate text-xs text-zinc-500">{preset.description}</p>
            )}
          </div>
        )}
      </div>

      <div className="flex items-center justify-between">
        <span className="text-[10px] text-zinc-600">{formatDate(preset.updatedAt)}</span>
        <div className="flex items-center gap-1">
          <Button
            size="sm"
            variant="ghost"
            className="h-6 px-2 text-xs text-zinc-400 hover:text-zinc-200"
            onClick={() => onLoad(preset.id)}
          >
            Load
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="h-6 w-6 p-0 text-zinc-500 hover:text-zinc-300"
            onClick={() => {
              setEditName(preset.name)
              setEditing(true)
            }}
          >
            <Pencil size={11} />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="h-6 w-6 p-0 text-zinc-500 hover:text-zinc-300"
            onClick={() => onExport(preset.id)}
          >
            <Download size={11} />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className={`h-6 w-6 p-0 ${
              confirmDelete
                ? 'text-red-400 hover:text-red-300'
                : 'text-zinc-500 hover:text-red-400'
            }`}
            onClick={handleDelete}
          >
            <Trash2 size={11} />
          </Button>
        </div>
      </div>
    </div>
  )
}

export function PresetsManager({ children }: { children: ReactNode }) {
  const presets = usePresetsStore((s) => s.presets)
  const savePreset = usePresetsStore((s) => s.savePreset)
  const loadPreset = usePresetsStore((s) => s.loadPreset)
  const deletePreset = usePresetsStore((s) => s.deletePreset)
  const renamePreset = usePresetsStore((s) => s.renamePreset)
  const exportPreset = usePresetsStore((s) => s.exportPreset)
  const importPreset = usePresetsStore((s) => s.importPreset)

  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [newName, setNewName] = useState('')
  const [newDescription, setNewDescription] = useState('')

  const handleSave = useCallback(() => {
    if (!newName.trim()) return
    savePreset(newName.trim(), newDescription.trim())
    setNewName('')
    setNewDescription('')
    setSaving(false)
  }, [newName, newDescription, savePreset])

  const handleLoad = useCallback(
    (id: string) => {
      loadPreset(id)
      setOpen(false)
    },
    [loadPreset]
  )

  const handleExport = useCallback(
    (id: string) => {
      const json = exportPreset(id)
      const blob = new Blob([json], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      const preset = presets.find((p) => p.id === id)
      a.download = `preset-${preset?.name?.replace(/\s+/g, '-').toLowerCase() ?? id}.json`
      a.click()
      URL.revokeObjectURL(url)
    },
    [exportPreset, presets]
  )

  const handleImport = useCallback(() => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.json'
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (!file) return
      const reader = new FileReader()
      reader.onload = (ev) => {
        const result = ev.target?.result as string
        if (result) {
          importPreset(result)
        }
      }
      reader.readAsText(file)
    }
    input.click()
  }, [importPreset])

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="max-w-md border-zinc-700 bg-zinc-900 text-zinc-100 sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-zinc-100">Pipeline Presets</DialogTitle>
        </DialogHeader>

        {/* Save new preset */}
        {saving ? (
          <div className="space-y-2 rounded-md border border-zinc-700 bg-zinc-800/50 p-3">
            <Input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Preset name"
              className="h-8 border-zinc-600 bg-zinc-700 text-sm text-zinc-200 placeholder:text-zinc-500"
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSave()
                if (e.key === 'Escape') setSaving(false)
              }}
              autoFocus
            />
            <Input
              value={newDescription}
              onChange={(e) => setNewDescription(e.target.value)}
              placeholder="Description (optional)"
              className="h-8 border-zinc-600 bg-zinc-700 text-sm text-zinc-200 placeholder:text-zinc-500"
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSave()
              }}
            />
            <div className="flex justify-end gap-2">
              <Button
                size="sm"
                variant="ghost"
                className="h-7 text-xs text-zinc-400"
                onClick={() => setSaving(false)}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                className="h-7 gap-1 bg-green-600 text-xs hover:bg-green-700"
                onClick={handleSave}
                disabled={!newName.trim()}
              >
                <Save size={12} />
                Save
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex gap-2">
            <Button
              size="sm"
              className="h-8 gap-1.5 bg-green-600 text-xs hover:bg-green-700"
              onClick={() => setSaving(true)}
            >
              <Save size={13} />
              Save Current
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-8 gap-1.5 border-zinc-700 text-xs text-zinc-300 hover:bg-zinc-800"
              onClick={handleImport}
            >
              <Upload size={13} />
              Import
            </Button>
          </div>
        )}

        {/* Presets list */}
        {presets.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <p className="text-sm text-zinc-500">No presets saved yet</p>
            <p className="mt-1 text-xs text-zinc-600">
              Save your current pipeline configuration as a preset to reuse it later.
            </p>
          </div>
        ) : (
          <ScrollArea className="max-h-[320px]">
            <div className="space-y-2 pr-2">
              {presets.map((preset) => (
                <PresetRow
                  key={preset.id}
                  preset={preset}
                  onLoad={handleLoad}
                  onDelete={deletePreset}
                  onRename={renamePreset}
                  onExport={handleExport}
                />
              ))}
            </div>
          </ScrollArea>
        )}
      </DialogContent>
    </Dialog>
  )
}
