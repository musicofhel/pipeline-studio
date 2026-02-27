import { BaseNode } from '@/components/nodes/BaseNode'

// All node types use the BaseNode component which renders dynamically
// based on the node type from the registry. Individual node components
// in components/nodes/* can override BaseNode when needed for
// category-specific rendering (e.g., QueryInputNode with a text input).
export const nodeTypesMap: Record<string, typeof BaseNode> = {
  query_input: BaseNode,
  injection_filter: BaseNode,
  pii_detector: BaseNode,
  lakera_guard: BaseNode,
  safety_gate: BaseNode,
  semantic_router: BaseNode,
  query_expander: BaseNode,
  qdrant_retrieval: BaseNode,
  deduplication: BaseNode,
  cohere_rerank: BaseNode,
  bm25_compression: BaseNode,
  model_router: BaseNode,
  llm_generation: BaseNode,
  hhem_checker: BaseNode,
  output_schema: BaseNode,
  langfuse_tracing: BaseNode,
  prometheus_metrics: BaseNode,
  response_output: BaseNode,
}
