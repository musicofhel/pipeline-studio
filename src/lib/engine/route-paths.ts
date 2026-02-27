/**
 * Route path definitions for the semantic router.
 *
 * Each route maps to the node types that are active when that route is selected.
 * Nodes not in the active list for a given route are skipped during execution.
 */

export const ROUTE_PATHS: Record<string, string[]> = {
  rag_knowledge_base: [
    'query_input',
    'injection_filter',
    'pii_detector',
    'lakera_guard',
    'safety_gate',
    'semantic_router',
    'query_expander',
    'qdrant_retrieval',
    'deduplication',
    'cohere_rerank',
    'bm25_compression',
    'model_router',
    'llm_generation',
    'hhem_checker',
    'output_schema',
    'langfuse_tracing',
    'response_output',
  ],
  direct_llm: [
    'query_input',
    'injection_filter',
    'pii_detector',
    'lakera_guard',
    'safety_gate',
    'semantic_router',
    'model_router',
    'llm_generation',
    'hhem_checker',
    'output_schema',
    'langfuse_tracing',
    'response_output',
  ],
  chitchat: [
    'query_input',
    'injection_filter',
    'pii_detector',
    'lakera_guard',
    'safety_gate',
    'semantic_router',
    'model_router',
    'llm_generation',
    'output_schema',
    'langfuse_tracing',
    'response_output',
  ],
  code_generation: [
    'query_input',
    'injection_filter',
    'pii_detector',
    'lakera_guard',
    'safety_gate',
    'semantic_router',
    'query_expander',
    'qdrant_retrieval',
    'deduplication',
    'cohere_rerank',
    'bm25_compression',
    'model_router',
    'llm_generation',
    'hhem_checker',
    'output_schema',
    'langfuse_tracing',
    'response_output',
  ],
  out_of_scope: [
    'query_input',
    'injection_filter',
    'pii_detector',
    'lakera_guard',
    'safety_gate',
    'semantic_router',
    'response_output',
  ],
}

/**
 * Given a route, return which node types should be skipped.
 * Computes the set difference between all known node types and the active types for the route.
 */
export function getSkippedNodeTypes(route: string): string[] {
  const activeTypes = ROUTE_PATHS[route]
  if (!activeTypes) return []
  // Collect all node types referenced in any route path
  const allTypes = new Set(Object.values(ROUTE_PATHS).flat())
  return [...allTypes].filter((t) => !activeTypes.includes(t))
}

/**
 * Check whether a node type is active for a given route.
 */
export function isNodeActiveForRoute(route: string, nodeType: string): boolean {
  const activeTypes = ROUTE_PATHS[route]
  if (!activeTypes) return true // Unknown route — assume all active
  return activeTypes.includes(nodeType)
}

/**
 * Get all known routes.
 */
export function getAvailableRoutes(): string[] {
  return Object.keys(ROUTE_PATHS)
}
