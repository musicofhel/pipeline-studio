import { NextResponse } from 'next/server'

const PIPELINE_API_URL = process.env.PIPELINE_API_URL ?? 'http://localhost:8000'

export async function GET() {
  try {
    const res = await fetch(`${PIPELINE_API_URL}/health`)
    const data = await res.json()
    return NextResponse.json(data, { status: res.status })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Health check proxy error' },
      { status: 502 }
    )
  }
}
