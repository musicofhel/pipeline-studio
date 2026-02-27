'use client'

import { useEffect, useState } from 'react'
import { ReactFlowProvider } from '@xyflow/react'
import { PipelineCanvas } from '@/components/canvas/PipelineCanvas'
import { CanvasControls } from '@/components/canvas/CanvasControls'
import { NodePalette } from '@/components/sidebar/NodePalette'
import { ConfigPanel } from '@/components/panels/ConfigPanel'
import { ExecutionPanel } from '@/components/panels/ExecutionPanel'
import { ComparisonPanel } from '@/components/panels/ComparisonPanel'
import { BatchTestPanel } from '@/components/panels/BatchTestPanel'
import { KeyboardShortcutsHelp } from '@/components/panels/KeyboardShortcutsHelp'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { usePipelineStore, type PipelineNode } from '@/lib/store/pipeline-store'
import { useUIStore } from '@/lib/store/ui-store'
import { loadPipelineFromStorage, savePipelineToStorage } from '@/lib/engine/serializer'
import { NODE_REGISTRY } from '@/lib/nodes/registry'
import { getLayoutedElements } from '@/lib/layout/elk-layout'
import { Keyboard, PanelBottom, PanelBottomClose, PanelLeft, PanelLeftClose } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function Home() {
  const [loaded, setLoaded] = useState(false)
  const [shortcutsHelpOpen, setShortcutsHelpOpen] = useState(false)
  const loadPipeline = usePipelineStore((s) => s.loadPipeline)
  const nodes = usePipelineStore((s) => s.nodes)
  const edges = usePipelineStore((s) => s.edges)
  const sidebarOpen = useUIStore((s) => s.sidebarOpen)
  const toggleSidebar = useUIStore((s) => s.toggleSidebar)
  const executionPanelOpen = useUIStore((s) => s.executionPanelOpen)
  const toggleExecutionPanel = useUIStore((s) => s.toggleExecutionPanel)
  const comparisonPanelOpen = useUIStore((s) => s.comparisonPanelOpen)
  const batchTestPanelOpen = useUIStore((s) => s.batchTestPanelOpen)

  // Load pipeline on mount
  useEffect(() => {
    const stored = loadPipelineFromStorage()
    if (stored) {
      loadPipeline({ nodes: stored.nodes, edges: stored.edges })
      setLoaded(true)
    } else {
      fetch('/default-pipeline.json')
        .then((r) => r.json())
        .then((data) => {
          const nodesWithDefaults: PipelineNode[] = data.nodes.map((n: PipelineNode) => {
            const def = n.type ? NODE_REGISTRY[n.type] : null
            return {
              ...n,
              data: {
                ...n.data,
                config: { ...(def?.defaultConfig ?? {}), ...n.data.config },
              },
            }
          })
          loadPipeline({ nodes: nodesWithDefaults, edges: data.edges })
          setLoaded(true)
        })
        .catch((err) => {
          console.error('Failed to load default pipeline:', err)
          setLoaded(true)
        })
    }
  }, [loadPipeline])

  // Auto-save on changes
  useEffect(() => {
    if (!loaded || nodes.length === 0) return
    const timeout = setTimeout(() => {
      savePipelineToStorage(nodes, edges)
    }, 500)
    return () => clearTimeout(timeout)
  }, [nodes, edges, loaded])

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Skip shortcuts when focus is in an input, textarea, or contenteditable
      const target = e.target as HTMLElement
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      ) {
        return
      }

      // Ctrl/Cmd+Z — Undo
      if (e.key === 'z' && (e.ctrlKey || e.metaKey) && !e.shiftKey) {
        e.preventDefault()
        usePipelineStore.temporal.getState().undo()
        return
      }

      // Ctrl/Cmd+Shift+Z — Redo
      if (e.key === 'z' && (e.ctrlKey || e.metaKey) && e.shiftKey) {
        e.preventDefault()
        usePipelineStore.temporal.getState().redo()
        return
      }

      // Don't trigger single-key shortcuts when modifier keys are held
      if (e.ctrlKey || e.metaKey || e.altKey) return

      // Space — Run pipeline
      if (e.key === ' ') {
        e.preventDefault()
        window.dispatchEvent(new CustomEvent('pipeline:run'))
        return
      }

      // Escape — Deselect node and close config panel
      if (e.key === 'Escape') {
        e.preventDefault()
        usePipelineStore.getState().setSelectedNodeId(null)
        useUIStore.getState().setConfigPanelOpen(false)
        return
      }

      // d — Duplicate selected node
      if (e.key === 'd') {
        const selectedId = usePipelineStore.getState().selectedNodeId
        if (selectedId) {
          e.preventDefault()
          usePipelineStore.getState().duplicateNode(selectedId)
        }
        return
      }

      // l — Auto-layout (ELK)
      if (e.key === 'l') {
        e.preventDefault()
        const state = usePipelineStore.getState()
        getLayoutedElements(state.nodes, state.edges).then(({ nodes: ln, edges: le }) => {
          usePipelineStore.getState().setNodes(ln)
          usePipelineStore.getState().setEdges(le)
        }).catch((err) => {
          console.error('Auto-layout failed:', err)
        })
        return
      }

      // ? — Show keyboard shortcuts help
      if (e.key === '?') {
        e.preventDefault()
        setShortcutsHelpOpen(true)
        return
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  if (!loaded) {
    return (
      <div className="flex h-screen items-center justify-center bg-zinc-950 text-zinc-400">
        Loading pipeline...
      </div>
    )
  }

  return (
    <ErrorBoundary>
      <ReactFlowProvider>
        <div className="flex h-screen flex-col bg-zinc-950">
          <div className="flex flex-1 overflow-hidden">
            {sidebarOpen && <NodePalette />}

            <div className="relative flex flex-1 flex-col">
              <div className="absolute left-2 top-2 z-10 flex items-center gap-2">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={toggleSidebar}
                  className="h-8 w-8 p-0 text-zinc-400 bg-zinc-900/90 border border-zinc-700"
                >
                  {sidebarOpen ? <PanelLeftClose size={16} /> : <PanelLeft size={16} />}
                </Button>
              </div>

              <div className="absolute left-1/2 top-2 z-10 -translate-x-1/2">
                <CanvasControls />
              </div>

              <div className="absolute bottom-2 left-2 z-10">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={toggleExecutionPanel}
                  className="h-8 gap-1.5 text-xs text-zinc-400 bg-zinc-900/90 border border-zinc-700"
                >
                  {executionPanelOpen ? <PanelBottomClose size={14} /> : <PanelBottom size={14} />}
                  Execution
                </Button>
              </div>

              <div className="absolute bottom-2 right-2 z-10">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setShortcutsHelpOpen(true)}
                  className="h-8 w-8 p-0 text-zinc-400 bg-zinc-900/90 border border-zinc-700"
                  title="Keyboard shortcuts (?)"
                >
                  <Keyboard size={14} />
                </Button>
              </div>

              <div className="flex-1">
                <PipelineCanvas />
              </div>

              {executionPanelOpen && (
                <div className="h-64 border-t border-zinc-700 bg-zinc-900">
                  <ExecutionPanel />
                </div>
              )}

              {comparisonPanelOpen && (
                <div className="h-64 border-t border-zinc-700 bg-zinc-900">
                  <ComparisonPanel />
                </div>
              )}

              {batchTestPanelOpen && (
                <div className="h-72 border-t border-zinc-700 bg-zinc-900">
                  <BatchTestPanel />
                </div>
              )}
            </div>

            <ConfigPanel />
          </div>
        </div>

        <KeyboardShortcutsHelp
          open={shortcutsHelpOpen}
          onOpenChange={setShortcutsHelpOpen}
        />
      </ReactFlowProvider>
    </ErrorBoundary>
  )
}
