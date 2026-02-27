import { NodeCategory, NodeDefinition } from '@/types/nodes'

export const NODE_REGISTRY: Record<string, NodeDefinition> = {
  query_input: {
    type: 'query_input',
    category: 'input',
    label: 'Query Input',
    description: 'Entry point — user query with metadata',
    icon: 'MessageSquare',
    color: '#6366f1',
    inputs: [],
    outputs: [
      { id: 'query', type: 'query', label: 'Query', position: 'right', required: false, multiple: true },
    ],
    configSchema: [
      { key: 'user_id', label: 'User ID', type: 'text', default: 'test-user' },
      { key: 'tenant_id', label: 'Tenant ID', type: 'text', default: 'default' },
      { key: 'query', label: 'Test Query', type: 'text', default: 'What is the remote work policy?' },
    ],
    defaultConfig: { user_id: 'test-user', tenant_id: 'default', query: '' },
    service: 'local',
  },

  injection_filter: {
    type: 'injection_filter',
    category: 'safety',
    label: 'L1 Injection Filter',
    description: 'Regex-based prompt injection detection (15 patterns)',
    icon: 'ShieldAlert',
    color: '#ef4444',
    inputs: [
      { id: 'query_in', type: 'query', label: 'Query', position: 'left', required: true, multiple: false },
    ],
    outputs: [
      { id: 'query_out', type: 'query', label: 'Query (safe)', position: 'right', required: false, multiple: false },
      { id: 'safety', type: 'safety_result', label: 'Safety Result', position: 'bottom', required: false, multiple: false },
    ],
    configSchema: [
      { key: 'enabled', label: 'Enabled', type: 'boolean', default: true },
      { key: 'patterns_count', label: 'Pattern Count', type: 'number', default: 15, description: 'Number of regex patterns (backend: 15)' },
      { key: 'block_on_match', label: 'Block on Match', type: 'boolean', default: true },
    ],
    defaultConfig: { enabled: true, patterns_count: 15, block_on_match: true },
    service: 'local',
    estimatedLatencyMs: 2,
  },

  pii_detector: {
    type: 'pii_detector',
    category: 'safety',
    label: 'PII Detector',
    description: 'Regex-based PII detection and redaction (8 types)',
    icon: 'Eye',
    color: '#ef4444',
    inputs: [
      { id: 'query_in', type: 'query', label: 'Query', position: 'left', required: true, multiple: false },
    ],
    outputs: [
      { id: 'query_out', type: 'query', label: 'Query (redacted)', position: 'right', required: false, multiple: false },
      { id: 'safety', type: 'safety_result', label: 'PII Result', position: 'bottom', required: false, multiple: false },
    ],
    configSchema: [
      { key: 'enabled', label: 'Enabled', type: 'boolean', default: true },
      { key: 'redact', label: 'Redact PII', type: 'boolean', default: true },
      {
        key: 'types', label: 'PII Types', type: 'select', default: 'all',
        options: [
          { label: 'All', value: 'all' },
          { label: 'SSN + CC only', value: 'financial' },
          { label: 'Email + Phone only', value: 'contact' },
        ],
      },
    ],
    defaultConfig: { enabled: true, redact: true, types: 'all' },
    service: 'local',
    estimatedLatencyMs: 1,
  },

  lakera_guard: {
    type: 'lakera_guard',
    category: 'safety',
    label: 'Lakera Guard (L2)',
    description: 'ML-based injection detection via Lakera API',
    icon: 'ShieldCheck',
    color: '#ef4444',
    inputs: [
      { id: 'query_in', type: 'query', label: 'Query', position: 'left', required: false, multiple: false },
    ],
    outputs: [
      { id: 'query_out', type: 'query', label: 'Query (verified)', position: 'right', required: false, multiple: false },
      { id: 'safety', type: 'safety_result', label: 'Guard Result', position: 'bottom', required: false, multiple: false },
    ],
    configSchema: [
      { key: 'enabled', label: 'Enabled', type: 'boolean', default: true },
      { key: 'threshold', label: 'Confidence Threshold', type: 'slider', default: 0.85, min: 0, max: 1, step: 0.05 },
    ],
    defaultConfig: { enabled: true, threshold: 0.85 },
    service: 'lakera',
    requiresApiKey: 'LAKERA_API_KEY',
    estimatedLatencyMs: 150,
  },

  safety_gate: {
    type: 'safety_gate',
    category: 'safety',
    label: 'Safety Gate',
    description: 'Aggregates parallel safety checks — blocks if ANY check fails',
    icon: 'ShieldBan',
    color: '#ef4444',
    inputs: [
      { id: 'injection_result', type: 'safety_result', label: 'Injection Result', position: 'left', required: true, multiple: false },
      { id: 'pii_result', type: 'safety_result', label: 'PII Result', position: 'left', required: true, multiple: false },
      { id: 'lakera_result', type: 'safety_result', label: 'Lakera Result', position: 'left', required: true, multiple: false },
      { id: 'query_in', type: 'query', label: 'Query', position: 'left', required: true, multiple: false },
    ],
    outputs: [
      { id: 'query_out', type: 'query', label: 'Query (all checks passed)', position: 'right', required: false, multiple: false },
      { id: 'safety_summary', type: 'safety_result', label: 'Aggregate Result', position: 'bottom', required: false, multiple: false },
    ],
    configSchema: [
      { key: 'require_all', label: 'Require All Checks Pass', type: 'boolean', default: true },
      { key: 'fail_open', label: 'Pass if Check Unavailable', type: 'boolean', default: false },
    ],
    defaultConfig: { require_all: true, fail_open: false },
    service: 'local',
    estimatedLatencyMs: 1,
  },

  semantic_router: {
    type: 'semantic_router',
    category: 'routing',
    label: 'Semantic Router',
    description: 'Embedding-based query classification (max-sim cosine scoring)',
    icon: 'GitBranch',
    color: '#f59e0b',
    inputs: [
      { id: 'query_in', type: 'query', label: 'Query', position: 'left', required: true, multiple: false },
    ],
    outputs: [
      { id: 'route', type: 'route', label: 'Route', position: 'right', required: false, multiple: true },
      { id: 'query_out', type: 'query', label: 'Query', position: 'right', required: false, multiple: false },
    ],
    configSchema: [
      { key: 'model', label: 'Embedding Model', type: 'text', default: 'all-MiniLM-L6-v2' },
      { key: 'threshold', label: 'Confidence Threshold', type: 'slider', default: 0.5, min: 0, max: 1, step: 0.05 },
      {
        key: 'scoring', label: 'Scoring Method', type: 'select', default: 'max',
        options: [{ label: 'Max Similarity', value: 'max' }, { label: 'Mean Similarity', value: 'mean' }],
      },
      {
        key: 'routes', label: 'Routes', type: 'json',
        default: ['rag_knowledge_base', 'direct_llm', 'chitchat', 'code_generation', 'out_of_scope'],
        description: 'Must match routes.yaml in backend (5 routes)',
      },
    ],
    defaultConfig: { model: 'all-MiniLM-L6-v2', threshold: 0.5, scoring: 'max' },
    service: 'local',
    estimatedLatencyMs: 50,
  },

  query_expander: {
    type: 'query_expander',
    category: 'expansion',
    label: 'Query Expander',
    description: 'MultiQueryRetriever — generates 3 rephrasings via Claude Haiku',
    icon: 'Expand',
    color: '#8b5cf6',
    inputs: [
      { id: 'query_in', type: 'query', label: 'Query', position: 'left', required: true, multiple: false },
      { id: 'route', type: 'route', label: 'Route', position: 'top', required: false, multiple: false },
    ],
    outputs: [
      { id: 'queries', type: 'queries', label: 'Expanded Queries', position: 'right', required: false, multiple: false },
    ],
    configSchema: [
      { key: 'enabled', label: 'Enabled', type: 'boolean', default: true },
      {
        key: 'mode', label: 'Mode', type: 'select', default: 'conditional',
        options: [
          { label: 'Always', value: 'always' },
          { label: 'Conditional (by confidence)', value: 'conditional' },
          { label: 'Never', value: 'never' },
        ],
      },
      { key: 'confidence_threshold', label: 'Skip if confidence >=', type: 'slider', default: 0.75, min: 0, max: 1, step: 0.05 },
      { key: 'max_rephrasings', label: 'Max Rephrasings', type: 'number', default: 3, min: 1, max: 5 },
      { key: 'concurrent', label: 'Concurrent Calls', type: 'boolean', default: true },
    ],
    defaultConfig: { enabled: true, mode: 'conditional', confidence_threshold: 0.75, max_rephrasings: 3, concurrent: true },
    service: 'openrouter',
    requiresApiKey: 'OPENROUTER_API_KEY',
    estimatedLatencyMs: 1000,
    estimatedCostPerCall: 0.001,
  },

  qdrant_retrieval: {
    type: 'qdrant_retrieval',
    category: 'retrieval',
    label: 'Qdrant Retrieval',
    description: 'Vector similarity search against Qdrant collection',
    icon: 'Database',
    color: '#06b6d4',
    inputs: [
      { id: 'queries', type: 'queries', label: 'Queries', position: 'left', required: true, multiple: false },
    ],
    outputs: [
      { id: 'documents', type: 'documents', label: 'Documents', position: 'right', required: false, multiple: false },
    ],
    configSchema: [
      { key: 'collection', label: 'Collection', type: 'text', default: 'enterprise_pipeline' },
      { key: 'top_k', label: 'Top K', type: 'number', default: 20, min: 1, max: 50 },
      { key: 'score_threshold', label: 'Min Score', type: 'slider', default: 0.3, min: 0, max: 1, step: 0.05 },
    ],
    defaultConfig: { collection: 'enterprise_pipeline', top_k: 20, score_threshold: 0.3 },
    service: 'qdrant',
    estimatedLatencyMs: 50,
  },

  deduplication: {
    type: 'deduplication',
    category: 'retrieval',
    label: 'Deduplication',
    description: 'Cosine similarity dedup (threshold: 0.95)',
    icon: 'Copy',
    color: '#06b6d4',
    inputs: [
      { id: 'documents_in', type: 'documents', label: 'Documents', position: 'left', required: true, multiple: false },
    ],
    outputs: [
      { id: 'documents_out', type: 'documents', label: 'Deduplicated', position: 'right', required: false, multiple: false },
    ],
    configSchema: [
      { key: 'threshold', label: 'Similarity Threshold', type: 'slider', default: 0.95, min: 0.8, max: 1, step: 0.01 },
    ],
    defaultConfig: { threshold: 0.95 },
    service: 'local',
    estimatedLatencyMs: 5,
  },

  cohere_rerank: {
    type: 'cohere_rerank',
    category: 'retrieval',
    label: 'Cohere Rerank',
    description: 'Neural reranking via Cohere API',
    icon: 'ArrowUpDown',
    color: '#06b6d4',
    inputs: [
      { id: 'documents_in', type: 'documents', label: 'Documents', position: 'left', required: true, multiple: false },
      { id: 'query', type: 'query', label: 'Original Query', position: 'top', required: true, multiple: false },
    ],
    outputs: [
      { id: 'documents_out', type: 'documents', label: 'Reranked', position: 'right', required: false, multiple: false },
    ],
    configSchema: [
      {
        key: 'model', label: 'Model', type: 'select', default: 'rerank-english-v3.0',
        options: [
          { label: 'rerank-english-v3.0', value: 'rerank-english-v3.0' },
          { label: 'rerank-multilingual-v3.0', value: 'rerank-multilingual-v3.0' },
        ],
      },
      { key: 'top_n', label: 'Top N', type: 'number', default: 5, min: 1, max: 20 },
      {
        key: 'fallback_mode', label: 'Fallback if No API Key', type: 'select', default: 'passthrough',
        options: [
          { label: 'Passthrough (skip reranking)', value: 'passthrough' },
          { label: 'Error', value: 'error' },
        ],
        description: 'Backend falls back to passthrough if COHERE_API_KEY is not set',
      },
    ],
    defaultConfig: { model: 'rerank-english-v3.0', top_n: 5 },
    service: 'cohere',
    requiresApiKey: 'COHERE_API_KEY',
    estimatedLatencyMs: 200,
    estimatedCostPerCall: 0.001,
  },

  bm25_compression: {
    type: 'bm25_compression',
    category: 'compression',
    label: 'BM25 Compression',
    description: 'Sub-scoring compression — removes low-relevance sentences',
    icon: 'Minimize2',
    color: '#10b981',
    inputs: [
      { id: 'documents_in', type: 'documents', label: 'Documents', position: 'left', required: true, multiple: false },
      { id: 'query', type: 'query', label: 'Original Query', position: 'top', required: true, multiple: false },
    ],
    outputs: [
      { id: 'context', type: 'context', label: 'Compressed Context', position: 'right', required: false, multiple: true },
    ],
    configSchema: [
      { key: 'min_score_ratio', label: 'Min Score Ratio', type: 'slider', default: 0.3, min: 0, max: 1, step: 0.05 },
      { key: 'token_budget', label: 'Token Budget', type: 'number', default: 4000, min: 500, max: 16000, step: 500 },
    ],
    defaultConfig: { min_score_ratio: 0.3, token_budget: 4000 },
    service: 'local',
    estimatedLatencyMs: 10,
  },

  model_router: {
    type: 'model_router',
    category: 'generation',
    label: 'Model Router',
    description: 'Selects Haiku/Sonnet based on query complexity',
    icon: 'Route',
    color: '#3b82f6',
    inputs: [
      { id: 'query', type: 'query', label: 'Query', position: 'left', required: true, multiple: false },
      { id: 'route', type: 'route', label: 'Route', position: 'top', required: false, multiple: false },
      { id: 'context', type: 'context', label: 'Context', position: 'left', required: false, multiple: false },
    ],
    outputs: [
      { id: 'config', type: 'config', label: 'Model Config', position: 'right', required: false, multiple: false },
    ],
    configSchema: [
      { key: 'enabled', label: 'Enabled', type: 'boolean', default: true },
      { key: 'fast_model', label: 'Fast Model', type: 'text', default: 'anthropic/claude-haiku-4-5' },
      { key: 'standard_model', label: 'Standard Model', type: 'text', default: 'anthropic/claude-sonnet-4-5' },
      { key: 'force_model', label: 'Force Model (override)', type: 'text', default: '', description: 'Leave empty for auto-routing' },
    ],
    defaultConfig: { enabled: true, fast_model: 'anthropic/claude-haiku-4-5', standard_model: 'anthropic/claude-sonnet-4-5', force_model: '' },
    service: 'local',
    estimatedLatencyMs: 1,
  },

  llm_generation: {
    type: 'llm_generation',
    category: 'generation',
    label: 'LLM Generation',
    description: 'Generate response via OpenRouter',
    icon: 'Sparkles',
    color: '#3b82f6',
    inputs: [
      { id: 'context', type: 'context', label: 'Context', position: 'left', required: false, multiple: false },
      { id: 'query', type: 'query', label: 'Query', position: 'left', required: true, multiple: false },
      { id: 'model_config', type: 'config', label: 'Model Config', position: 'top', required: false, multiple: false },
    ],
    outputs: [
      { id: 'response', type: 'response', label: 'Response', position: 'right', required: false, multiple: false },
    ],
    configSchema: [
      { key: 'model', label: 'Default Model', type: 'text', default: 'anthropic/claude-sonnet-4-5' },
      { key: 'temperature', label: 'Temperature', type: 'slider', default: 0.1, min: 0, max: 2, step: 0.1 },
      { key: 'max_tokens', label: 'Max Tokens', type: 'number', default: 1024, min: 64, max: 4096 },
      { key: 'system_prompt', label: 'System Prompt', type: 'code', default: 'You are a helpful assistant. Answer based on the provided context.' },
    ],
    defaultConfig: { model: 'anthropic/claude-sonnet-4-5', temperature: 0.1, max_tokens: 1024 },
    service: 'openrouter',
    requiresApiKey: 'OPENROUTER_API_KEY',
    estimatedLatencyMs: 1500,
    estimatedCostPerCall: 0.005,
  },

  hhem_checker: {
    type: 'hhem_checker',
    category: 'quality',
    label: 'HHEM Hallucination Check',
    description: 'Vectara HHEM model — faithfulness scoring',
    icon: 'CheckCircle',
    color: '#f97316',
    inputs: [
      { id: 'response', type: 'response', label: 'Response', position: 'left', required: true, multiple: false },
      { id: 'context', type: 'context', label: 'Context', position: 'left', required: false, multiple: false },
    ],
    outputs: [
      { id: 'quality', type: 'quality', label: 'Quality Score', position: 'right', required: false, multiple: true },
      { id: 'response_out', type: 'response', label: 'Response (scored)', position: 'right', required: false, multiple: false },
    ],
    configSchema: [
      { key: 'threshold_pass', label: 'Pass Threshold', type: 'slider', default: 0.85, min: 0, max: 1, step: 0.05 },
      { key: 'threshold_warn', label: 'Warn Threshold', type: 'slider', default: 0.70, min: 0, max: 1, step: 0.05 },
      {
        key: 'aggregation', label: 'Aggregation', type: 'select', default: 'max',
        options: [{ label: 'Max', value: 'max' }, { label: 'Mean', value: 'mean' }, { label: 'Min', value: 'min' }],
      },
    ],
    defaultConfig: { threshold_pass: 0.85, threshold_warn: 0.70, aggregation: 'max' },
    service: 'local',
    estimatedLatencyMs: 150,
  },

  output_schema: {
    type: 'output_schema',
    category: 'quality',
    label: 'Output Schema Validator',
    description: 'Per-route JSON schema validation (backend stage 10)',
    icon: 'FileCheck',
    color: '#f97316',
    inputs: [
      { id: 'response', type: 'response', label: 'Response', position: 'left', required: true, multiple: false },
      { id: 'route', type: 'route', label: 'Route', position: 'top', required: false, multiple: false },
    ],
    outputs: [
      { id: 'response_out', type: 'response', label: 'Validated Response', position: 'right', required: false, multiple: true },
    ],
    configSchema: [
      { key: 'strict', label: 'Strict Validation', type: 'boolean', default: true },
      { key: 'schema_overrides', label: 'Schema Overrides (JSON)', type: 'json', default: {} },
    ],
    defaultConfig: { strict: true, schema_overrides: {} },
    service: 'local',
    estimatedLatencyMs: 1,
  },

  langfuse_tracing: {
    type: 'langfuse_tracing',
    category: 'observability',
    label: 'Langfuse Tracing',
    description: 'Trace recording to Langfuse',
    icon: 'Activity',
    color: '#a855f7',
    inputs: [
      { id: 'response', type: 'response', label: 'Response', position: 'left', required: true, multiple: false },
      { id: 'quality', type: 'quality', label: 'Quality', position: 'left', required: false, multiple: false },
    ],
    outputs: [
      { id: 'trace', type: 'trace', label: 'Trace', position: 'right', required: false, multiple: false },
    ],
    configSchema: [
      { key: 'enabled', label: 'Enabled', type: 'boolean', default: true },
      { key: 'sample_rate', label: 'Sample Rate', type: 'slider', default: 1.0, min: 0, max: 1, step: 0.1 },
      {
        key: 'fallback', label: 'Fallback if No Langfuse Key', type: 'select', default: 'local_json',
        options: [
          { label: 'Local JSON files', value: 'local_json' },
          { label: 'Disabled', value: 'disabled' },
        ],
        description: 'Backend falls back to local JSON tracing if LANGFUSE_SECRET_KEY is not set',
      },
    ],
    defaultConfig: { enabled: true, sample_rate: 1.0 },
    service: 'langfuse',
    requiresApiKey: 'LANGFUSE_SECRET_KEY',
  },

  prometheus_metrics: {
    type: 'prometheus_metrics',
    category: 'observability',
    label: 'Prometheus Metrics',
    description: 'Live metrics collection and display (34 metrics)',
    icon: 'BarChart3',
    color: '#a855f7',
    inputs: [
      { id: 'response', type: 'response', label: 'Response', position: 'left', required: false, multiple: false },
    ],
    outputs: [],
    configSchema: [
      { key: 'enabled', label: 'Enabled', type: 'boolean', default: true },
      { key: 'endpoint', label: 'Metrics Endpoint', type: 'text', default: '/metrics' },
      { key: 'poll_interval_ms', label: 'Poll Interval (ms)', type: 'number', default: 5000, min: 1000, max: 30000 },
    ],
    defaultConfig: { enabled: true, endpoint: '/metrics', poll_interval_ms: 5000 },
    service: 'local',
  },

  response_output: {
    type: 'response_output',
    category: 'output',
    label: 'Response Output',
    description: 'Final response delivery',
    icon: 'Send',
    color: '#6366f1',
    inputs: [
      { id: 'response', type: 'response', label: 'Response', position: 'left', required: true, multiple: false },
      { id: 'quality', type: 'quality', label: 'Quality', position: 'left', required: false, multiple: false },
      { id: 'trace', type: 'trace', label: 'Trace', position: 'left', required: false, multiple: false },
    ],
    outputs: [],
    configSchema: [
      { key: 'include_metadata', label: 'Include Metadata', type: 'boolean', default: true },
      { key: 'include_scores', label: 'Include Scores', type: 'boolean', default: true },
    ],
    defaultConfig: { include_metadata: true, include_scores: true },
    service: 'local',
  },
}

export const NODE_CATEGORIES: Record<NodeCategory, { label: string; color: string; icon: string }> = {
  input:         { label: 'Input',         color: '#6366f1', icon: 'MessageSquare' },
  safety:        { label: 'Safety',        color: '#ef4444', icon: 'Shield' },
  routing:       { label: 'Routing',       color: '#f59e0b', icon: 'GitBranch' },
  expansion:     { label: 'Expansion',     color: '#8b5cf6', icon: 'Expand' },
  retrieval:     { label: 'Retrieval',     color: '#06b6d4', icon: 'Database' },
  compression:   { label: 'Compression',   color: '#10b981', icon: 'Minimize2' },
  generation:    { label: 'Generation',    color: '#3b82f6', icon: 'Sparkles' },
  quality:       { label: 'Quality',       color: '#f97316', icon: 'CheckCircle' },
  observability: { label: 'Observability', color: '#a855f7', icon: 'Activity' },
  output:        { label: 'Output',        color: '#6366f1', icon: 'Send' },
}
