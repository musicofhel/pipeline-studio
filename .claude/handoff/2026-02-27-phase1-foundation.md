# Handoff: Pipeline Studio Phase 1 Foundation

**Date**: 2026-02-27
**Session focus**: Scaffold and build Phase 1 of Pipeline Studio — a visual node editor for the enterprise-pipeline RAG backend

## What Was Done

### Project Scaffolding
- Created `~/pipeline-studio` with `create-next-app@latest` (Next.js 16, TypeScript, Tailwind, App Router)
- Installed: `@xyflow/react` (React Flow v12), `zustand`, `elkjs`, `next-themes`, `zundo`, `lucide-react`, `recharts`
- Initialized shadcn/ui with 14 components (button, card, input, label, select, slider, switch, tabs, tooltip, dialog, dropdown-menu, sheet, badge, separator, scroll-area)

### Core Architecture (40 source files, ~2000 LOC)
1. **Type system** (`src/types/nodes.ts`, `pipeline.ts`) — HandleType union (10 types), NodeDefinition, ConfigField, PipelineNodeData with index signature for React Flow compat
2. **Node registry** (`src/lib/nodes/registry.ts`) — all 18 node definitions with full config schemas, handle definitions, service info, color codes
3. **Zustand stores** — `pipeline-store.ts` (nodes, edges, execution state, undo/redo via zundo) + `ui-store.ts` (sidebar, panels, theme)
4. **BaseNode** (`src/components/nodes/BaseNode.tsx`) — universal renderer: color-coded header by category, typed handles with per-type colors, 7 status states (idle/running/success/error/blocked/skipped/disabled), execution stats footer, API key indicator
5. **PipelineCanvas** — ReactFlow wrapper with dark mode, minimap, grid, snap-to-grid, drag-drop from palette, type-safe connection validation
6. **QueryBusEdge** — custom dashed indigo edge for query pass-through connections
7. **NodePalette** — left sidebar with collapsible categories, drag-to-add nodes
8. **ConfigPanel** — right panel with auto-generated forms from configSchema (text, number, boolean/switch, slider, select, json, code)
9. **ExecutionPanel** — bottom panel with run history, node status list, response preview, stats
10. **CanvasControls** — top toolbar: query input, Run/Stop, Reset, Auto Layout, Export/Import
11. **Engine** — `executor.ts` (demo + live modes), `validator.ts` (connection checking + topological sort), `serializer.ts` (localStorage + JSON import/export)
12. **ELK layout** — `elk-layout.ts` using layered algorithm with BRANDES_KOEPF placement
13. **BFF proxy** — `/api/pipeline/{query,health,metrics}` routes forwarding to FastAPI backend
14. **Default pipeline** — `public/default-pipeline.json` with 17 nodes and 28 edges fully wired

### Build Fixes
- `PipelineNodeData` needed `[key: string]: unknown` index signature for React Flow v12 type compat
- `IsValidConnection<PipelineEdge>` required extracting Connection fields from the union type
- `ReactFlowInstance` must be parameterized with `<PipelineNode, PipelineEdge>`
- Icon component type map needed `style?: React.CSSProperties`
- ELK layout function signatures updated to use `PipelineNode/PipelineEdge` instead of generic `Node/Edge`

## Commits
- `0637cf5` — Initial Pipeline Studio (58 files, 16804 insertions)

## What's Next (Phase 2)

Per the implementation plan, Phase 2 focuses on Canvas & Interaction refinement:

### High Priority
- **ELK.js in Web Worker** — move layout computation off main thread for 20+ nodes
- **Custom animated edges** — glowing dot traveling along edges during execution
- **Connection feedback** — green/red visual indicators while dragging connections
- **Right-click context menu** — delete, duplicate, disable, view data on nodes
- **Keyboard shortcuts** — Delete to remove, Space to run, Escape to deselect

### Also in Phase 2
- Node config panel improvements (backend config sync, "Current vs Override" display)
- Improved edge routing for the query bus pattern (avoid overlaps)
- Canvas minimap node coloring by category
- Touch support groundwork

### Phase 3 (Execution Engine)
- Real backend integration via POST /api/v1/query
- Trace replay: parse Langfuse trace spans → animate onto canvas nodes
- Split mapping for safety (1 span → 4 nodes), retrieval (1 span → 3 nodes), generation (1 span → 2 nodes)
- Conditional execution (route branching with skipped node visualization)
- SSE streaming for real-time execution progress

## Implementation Plan Reference
The full 6-phase implementation plan is in the user's prompt that created this session. It includes:
- Phase 1: Foundation (DONE)
- Phase 2: Canvas & Interaction
- Phase 3: Execution Engine (MVP trace replay)
- Phase 4: Live Observability (per-stage endpoints, metrics overlay)
- Phase 5: Advanced Features (save/load, comparison, batch testing, custom nodes)
- Phase 6: Polish & Deploy (responsive, docs, Docker)

## Not on GitHub Yet
The repo is local only. User hasn't asked to create a GitHub repo for it yet.
