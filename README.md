# Pipeline Studio

A visual node editor for building and testing RAG pipelines, designed as the frontend for [enterprise-pipeline](https://github.com/musicofhel/enterprise-pipeline).

<!-- ![Pipeline Studio Screenshot](docs/screenshot.png) -->

## Features

- **Visual node editor** -- drag-and-drop pipeline construction with React Flow v12
- **18 node types** spanning 10 categories: input, safety, routing, expansion, retrieval, compression, generation, quality, observability, output
- **Three execution modes** -- mock (local simulation), backend (live API), and streaming (SSE)
- **Preset management** -- save, load, import/export pipeline configurations as JSON
- **Batch testing** -- run multiple queries against a pipeline and compare results
- **Auto-layout** -- ELK.js-powered graph layout running in a Web Worker (non-blocking)
- **Execution overlay** -- real-time node status, timing, and data flow visualization
- **Trace timeline** -- step-by-step execution trace inspection
- **Health dashboard** -- live backend health and Prometheus metrics display
- **Node data inspector** -- inspect input/output data at each pipeline stage
- **Comparison panel** -- side-by-side pipeline output comparison
- **Keyboard shortcuts** -- full keyboard navigation and editing support
- **Dark mode** -- system-aware theme switching via next-themes

## Quick Start

```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Environment Variables

Copy `.env.local.example` to `.env.local` and configure:

```
PIPELINE_API_URL=http://localhost:8000
PIPELINE_API_KEY=your-api-key-here
```

## Docker

```bash
# Build and run with Docker Compose
docker compose up

# Or build manually
docker build -t pipeline-studio .
docker run -p 3000:3000 -e PIPELINE_API_URL=http://host.docker.internal:8000 pipeline-studio
```

The default `PIPELINE_API_URL` points to `host.docker.internal:8000`, which reaches the enterprise-pipeline backend running on the host machine.

## Architecture

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16 (App Router, standalone output) |
| Canvas | React Flow v12 (`@xyflow/react`) |
| State | Zustand 5 with zundo (undo/redo) |
| Layout | ELK.js via Web Worker |
| Styling | Tailwind CSS 4 + shadcn/ui |
| Charts | Recharts 3 |

### Project Structure

```
src/
  app/              # Next.js App Router pages and API routes
  components/
    canvas/         # PipelineCanvas, AnimatedEdge, ExecutionOverlay, controls
    nodes/          # BaseNode, NodeMetricsBadge
    panels/         # ConfigPanel, ExecutionPanel, BatchTestPanel, PresetsManager, ...
    sidebar/        # NodePalette (drag source)
    ui/             # shadcn/ui primitives
  lib/
    api/            # Pipeline API client
    engine/         # Executor, serializer, validator, trace mapper, route paths
    hooks/          # Backend status, metrics polling
    layout/         # ELK layout engine + Web Worker
    nodes/          # Node registry, handle colors, type map
    store/          # Zustand stores (pipeline, presets, metrics, UI)
  types/            # TypeScript type definitions
```

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl+Z` | Undo |
| `Ctrl+Shift+Z` | Redo |
| `Ctrl+S` | Save pipeline |
| `Ctrl+E` | Execute pipeline |
| `Ctrl+L` | Auto-layout |
| `Delete` / `Backspace` | Delete selected nodes/edges |
| `Ctrl+A` | Select all |
| `Ctrl+D` | Duplicate selected |
| `Escape` | Deselect all / close panels |

## Backend Connection

Pipeline Studio connects to the [enterprise-pipeline](https://github.com/musicofhel/enterprise-pipeline) FastAPI backend for:

- **Pipeline execution** -- sends serialized pipeline configs and receives stage-by-stage results
- **Streaming** -- SSE endpoint for real-time execution progress
- **Health monitoring** -- polls `/health` and `/metrics` endpoints
- **Query processing** -- full RAG pipeline execution with safety, retrieval, generation, and quality checks

The app works fully in mock mode without a backend connection, simulating execution locally with realistic timing and data.

## License

MIT
