export type HandleType =
  | 'query'
  | 'safety_result'
  | 'route'
  | 'queries'
  | 'documents'
  | 'context'
  | 'response'
  | 'quality'
  | 'trace'
  | 'config'

export interface HandleDefinition {
  id: string
  type: HandleType
  label: string
  position: 'left' | 'right' | 'top' | 'bottom'
  required: boolean
  multiple: boolean
}

export type NodeCategory =
  | 'input'
  | 'safety'
  | 'routing'
  | 'expansion'
  | 'retrieval'
  | 'compression'
  | 'generation'
  | 'quality'
  | 'observability'
  | 'output'

export interface ConfigField {
  key: string
  label: string
  type: 'text' | 'number' | 'boolean' | 'select' | 'slider' | 'json' | 'code'
  default: unknown
  options?: { label: string; value: unknown }[]
  min?: number
  max?: number
  step?: number
  description?: string
}

export interface NodeDefinition {
  type: string
  category: NodeCategory
  label: string
  description: string
  icon: string
  color: string
  inputs: HandleDefinition[]
  outputs: HandleDefinition[]
  configSchema: ConfigField[]
  defaultConfig: Record<string, unknown>
  service: 'local' | 'openrouter' | 'cohere' | 'lakera' | 'qdrant' | 'langfuse'
  requiresApiKey?: string
  estimatedLatencyMs?: number
  estimatedCostPerCall?: number
}

export type NodeStatus = 'idle' | 'running' | 'success' | 'error' | 'blocked' | 'skipped' | 'disabled'

export interface NodeExecutionData {
  status: NodeStatus
  latencyMs?: number
  cost?: number
  inputData?: Record<string, unknown>
  outputData?: Record<string, unknown>
  error?: string
  skipReason?: string
}

export interface PipelineNodeData {
  [key: string]: unknown
  config: Record<string, unknown>
  execution?: NodeExecutionData
  label?: string
  notes?: string
}

export interface PipelineEdgeData {
  [key: string]: unknown
  condition?: { route: string }
  dataPreview?: unknown
  animated?: boolean
}
