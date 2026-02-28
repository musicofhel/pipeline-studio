const SAMPLE_QUERY = 'What is the remote work policy?'

export function generateMockInput(nodeType: string): Record<string, unknown> {
  switch (nodeType) {
    case 'query_input':
      return { raw_query: SAMPLE_QUERY }
    case 'injection_filter':
      return { query: SAMPLE_QUERY }
    case 'pii_detector':
      return { query: SAMPLE_QUERY }
    case 'lakera_guard':
      return { query: SAMPLE_QUERY }
    case 'safety_gate':
      return {
        injection_result: { safe: true, score: 0.02 },
        pii_result: { safe: true, entities_found: 0 },
        lakera_result: { safe: true, confidence: 0.98 },
      }
    case 'semantic_router':
      return { query: SAMPLE_QUERY }
    case 'query_expander':
      return { query: SAMPLE_QUERY, route: 'rag_knowledge_base' }
    case 'qdrant_retrieval':
      return {
        queries: [SAMPLE_QUERY, 'remote work guidelines', 'WFH policy details'],
        collection: 'enterprise_docs',
        top_k: 20,
      }
    case 'deduplication':
      return { documents_count: 20, similarity_threshold: 0.85 }
    case 'cohere_rerank':
      return {
        query: SAMPLE_QUERY,
        documents_count: 15,
        model: 'rerank-english-v3.0',
      }
    case 'bm25_compression':
      return {
        documents_count: 10,
        query: SAMPLE_QUERY,
        max_tokens: 3000,
      }
    case 'model_router':
      return {
        route: 'rag_knowledge_base',
        query_complexity: 'medium',
      }
    case 'llm_generation':
      return {
        model: 'anthropic/claude-sonnet-4-5',
        context_tokens: 2847,
        query: SAMPLE_QUERY,
        temperature: 0.1,
      }
    case 'hhem_checker':
      return {
        response_length: 342,
        context_chunks: 5,
      }
    case 'output_schema':
      return {
        response_length: 342,
        route: 'rag_knowledge_base',
      }
    case 'langfuse_tracing':
      return {
        trace_name: 'rag-pipeline',
        spans_count: 12,
      }
    case 'prometheus_metrics':
      return {
        metrics_prefix: 'rag_pipeline',
        latency_ms: 1847,
      }
    case 'response_output':
      return {
        response_length: 342,
        format: 'json',
        include_metadata: true,
      }
    default:
      return {}
  }
}

export function generateMockOutput(nodeType: string): Record<string, unknown> {
  switch (nodeType) {
    case 'query_input':
      return { query: SAMPLE_QUERY, user_id: 'user-123', tenant_id: 'acme-corp' }
    case 'injection_filter':
      return {
        safe: true,
        score: 0.02,
        patterns_matched: 0,
        query_forwarded: SAMPLE_QUERY,
      }
    case 'pii_detector':
      return {
        safe: true,
        entities_found: 0,
        redacted: false,
        query_forwarded: SAMPLE_QUERY,
      }
    case 'lakera_guard':
      return {
        safe: true,
        confidence: 0.98,
        category: 'none',
        query_forwarded: SAMPLE_QUERY,
      }
    case 'safety_gate':
      return {
        all_passed: true,
        summary: '3/3 checks passed',
        query_forwarded: SAMPLE_QUERY,
      }
    case 'semantic_router':
      return {
        route: 'rag_knowledge_base',
        confidence: 0.94,
        scores: {
          rag_knowledge_base: 0.94,
          direct_llm: 0.03,
          chitchat: 0.02,
          code_generation: 0.01,
        },
      }
    case 'query_expander':
      return {
        original: SAMPLE_QUERY,
        expanded: [
          SAMPLE_QUERY,
          'remote work guidelines and eligibility',
          'work from home policy details and requirements',
        ],
      }
    case 'qdrant_retrieval':
      return {
        documents: [
          { id: 'doc-47', score: 0.92, title: 'Remote Work Policy v2.3' },
          { id: 'doc-12', score: 0.87, title: 'Employee Handbook Ch.8' },
          { id: 'doc-89', score: 0.81, title: 'HR Guidelines 2024' },
        ],
        total_retrieved: 20,
      }
    case 'deduplication':
      return {
        documents_before: 20,
        documents_after: 15,
        duplicates_removed: 5,
      }
    case 'cohere_rerank':
      return {
        reranked_top_3: [
          { id: 'doc-47', relevance: 0.97 },
          { id: 'doc-89', relevance: 0.91 },
          { id: 'doc-12', relevance: 0.84 },
        ],
        documents_reranked: 15,
      }
    case 'bm25_compression':
      return {
        context_tokens: 2847,
        chunks_selected: 5,
        compression_ratio: 0.42,
      }
    case 'model_router':
      return {
        selected_model: 'anthropic/claude-sonnet-4-5',
        reason: 'Route rag_knowledge_base \u2192 high-quality model',
      }
    case 'llm_generation':
      return {
        response: 'Our remote work policy allows eligible employees to work from home up to 3 days per week. Eligibility requires manager approval and a minimum of 6 months tenure...',
        tokens_used: 287,
        model: 'anthropic/claude-sonnet-4-5',
        finish_reason: 'stop',
      }
    case 'hhem_checker':
      return {
        hallucination_score: 0.12,
        passed: true,
        verdict: 'Response is well-grounded in provided context',
      }
    case 'output_schema':
      return {
        valid: true,
        format: 'structured',
        response_forwarded: true,
      }
    case 'langfuse_tracing':
      return {
        trace_id: 'trace-a1b2c3d4',
        spans_logged: 12,
        total_cost: 0.0067,
      }
    case 'prometheus_metrics':
      return {
        metrics_exported: 4,
        labels: ['route', 'model', 'status'],
      }
    case 'response_output':
      return {
        delivered: true,
        response_length: 342,
        total_latency_ms: 1847,
        total_cost: 0.0067,
      }
    default:
      return {}
  }
}
