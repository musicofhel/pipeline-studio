import { PipelineQueryRequest, PipelineQueryResponse, HealthResponse } from '@/types/pipeline'

const DEFAULT_API_URL = '/api/pipeline'

export class PipelineClient {
  private baseUrl: string
  private apiKey: string | null

  constructor(baseUrl = DEFAULT_API_URL, apiKey: string | null = null) {
    this.baseUrl = baseUrl
    this.apiKey = apiKey
  }

  private headers(): Record<string, string> {
    const h: Record<string, string> = { 'Content-Type': 'application/json' }
    if (this.apiKey) h['Authorization'] = `Bearer ${this.apiKey}`
    return h
  }

  async query(request: PipelineQueryRequest): Promise<PipelineQueryResponse> {
    const res = await fetch(`${this.baseUrl}/query`, {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify(request),
    })
    if (!res.ok) {
      const text = await res.text()
      throw new Error(`Pipeline query failed (${res.status}): ${text}`)
    }
    return res.json()
  }

  async health(): Promise<HealthResponse> {
    const res = await fetch(`${this.baseUrl}/health`, { headers: this.headers() })
    if (!res.ok) throw new Error(`Health check failed: ${res.status}`)
    return res.json()
  }

  async metrics(): Promise<string> {
    const res = await fetch(`${this.baseUrl}/metrics`, { headers: this.headers() })
    if (!res.ok) throw new Error(`Metrics fetch failed: ${res.status}`)
    return res.text()
  }
}

export const pipelineClient = new PipelineClient()
