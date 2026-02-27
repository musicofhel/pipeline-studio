export interface PipelineQueryRequest {
  query: string
  user_id: string
  tenant_id: string
  config_overrides?: Record<string, Record<string, unknown>>
}

export interface PipelineQueryResponse {
  answer: string
  trace_id: string
  sources: PipelineSource[]
  metadata: PipelineMetadata
  fallback: boolean
}

export interface PipelineSource {
  content: string
  score: number
  metadata: Record<string, unknown>
}

export interface PipelineMetadata {
  route: string
  model: string
  latency_ms: number
  tokens_used: number
  cost_usd: number
  hallucination_score: number
  hallucination_level: 'pass' | 'warn' | 'fail'
  stages_completed: string[]
  safety_passed: boolean
}

export interface TraceSpan {
  name: string
  start_time: string
  end_time: string
  duration_ms: number
  status: 'success' | 'error'
  input?: Record<string, unknown>
  output?: Record<string, unknown>
  metadata?: Record<string, unknown>
}

export interface PipelineTrace {
  trace_id: string
  spans: TraceSpan[]
  total_duration_ms: number
  model: string
  route: string
}

export interface HealthResponse {
  status: string
  version: string
  services: Record<string, { status: string; latency_ms?: number }>
}
