import { NextRequest, NextResponse } from 'next/server'

const PIPELINE_API_URL = process.env.PIPELINE_API_URL ?? 'http://localhost:8000'
const PIPELINE_API_KEY = process.env.PIPELINE_API_KEY ?? ''

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const headers: Record<string, string> = { 'Content-Type': 'application/json' }
    if (PIPELINE_API_KEY) headers['Authorization'] = `Bearer ${PIPELINE_API_KEY}`

    const res = await fetch(`${PIPELINE_API_URL}/api/v1/query`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    })

    const data = await res.json()
    return NextResponse.json(data, { status: res.status })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Pipeline proxy error' },
      { status: 502 }
    )
  }
}
